import type * as Party from 'partykit/server'
import {
	HistoryEntry,
	TLRecord,
	TLStoreSnapshot,
	createTLSchema,
	throttle,
} from 'tldraw'

export default class SyncParty implements Party.Server {
	records: Record<string, TLRecord> = {}

	readonly initResult: Promise<void>
	constructor(public party: Party.Party) {
		this.initResult = (async () => {
			const snapshot = (await this.party.storage.get(
				'snapshot',
			)) as TLStoreSnapshot
			if (!snapshot) return

			const migrationResult = this.schema.migrateStoreSnapshot(snapshot)
			if (migrationResult.type === 'error') {
				throw new Error(migrationResult.reason)
			}

			this.records = migrationResult.value
		})()
	}

	readonly schema = createTLSchema()

	persist = throttle(async () => {
		this.party.storage.put('snapshot', {
			store: this.records,
			schema: this.schema.serialize(),
		})
	}, 1000)

	async onConnect(connection: Party.Connection<unknown>) {
		// need to make sure we've loaded the snapshot before we can let clients connect
		await this.initResult
		connection.send(
			JSON.stringify({
				type: 'init',
				snapshot: { store: this.records, schema: this.schema.serialize() },
			}),
		)
	}

	onMessage(
		message: string,
		sender: Party.Connection<unknown>,
	): void | Promise<void> {
		const msg = JSON.parse(message as string)
		const schema = createTLSchema().serialize()
		switch (msg.type) {
			case 'update': {
				try {
					for (const update of msg.updates) {
						const {
							changes: { added, updated, removed },
						} = update as HistoryEntry<TLRecord>
						// Try to merge the update into our local store
						for (const record of Object.values(added)) {
							this.records[record.id] = record
						}
						for (const [, to] of Object.values(updated)) {
							this.records[to.id] = to
						}
						for (const record of Object.values(removed)) {
							delete this.records[record.id]
						}
					}
					// If it works, broadcast the update to all other clients
					this.party.broadcast(message, [sender.id])
					// and update the storage layer
					this.persist()
				} catch (err) {
					// If we have a problem merging the update, we need to send a snapshot
					// of the current state to the client so they can get back in sync.
					sender.send(
						JSON.stringify({
							type: 'recovery',
							snapshot: { store: this.records, schema },
						}),
					)
				}
				break
			}
			case 'recovery': {
				const schema = createTLSchema().serialize()
				// If the client asks for a recovery, send them a snapshot of the current state
				sender.send(
					JSON.stringify({
						type: 'recovery',
						snapshot: { store: this.records, schema },
					}),
				)
				break
			}
		}
	}
}
