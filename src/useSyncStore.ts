import {
	createTLStore,
	defaultShapeUtils,
	HistoryEntry,
	StoreListener,
	throttle,
	TLRecord,
	TLStoreWithStatus,
	computed,
	InstancePresenceRecordType,
	createPresenceStateDerivation,
	getUserPreferences,
	defaultUserPreferences,
	react,
	uniqueId, TLInstancePresence,
} from 'tldraw'
import { useState, useEffect } from 'react'
import usePartySocket from 'partysocket/react'
import { toast } from 'react-toastify'

import { CloseEvent } from 'partysocket/ws'

const HOME_PAGE = 'http://localhost:5173'

const clientId = uniqueId()

export function useSyncStore({ hostUrl, roomId = 'example' }: {
	hostUrl: string
	roomId?: string
}) {
	const [store] = useState(() => {
		// store.loadSnapshot(DEFAULT_STORE)
		return createTLStore({
			shapeUtils: [...defaultShapeUtils],
		})
	})

	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
		status: 'loading',
	})

	const socket = usePartySocket({
		// usePartySocket takes the same arguments as PartySocket.
		id: clientId,
		host: hostUrl,
		room: roomId,
		maxRetries: 10,
		protocol: 'ws',
		// in addition, you can provide socket lifecycle event handlers
		// (equivalent to using ws.addEventListener in an effect hook)
		onOpen() {
			setStoreWithStatus({
				status: 'synced-remote',
				connectionStatus: 'online',
				store,
			})
		},

		onMessage(message: MessageEvent<any>) {
			try {
				const data = JSON.parse(message.data)
				if (data.clientId === clientId) {
					return
				}

				switch (data.type) {
					case 'init': {
						store.loadSnapshot(data.snapshot)
						break
					}
					case 'recovery': {
						store.loadSnapshot(data.snapshot)
						break
					}
					case 'update': {
						try {
							for (const update of data.updates) {
								store.mergeRemoteChanges(() => {
									const {
										changes: { added, updated, removed },
									} = update as HistoryEntry<TLRecord>

									for (const record of Object.values(added)) {
										store.put([record])
									}
									for (const [, to] of Object.values(updated)) {
										store.put([to])
									}
									for (const record of Object.values(removed)) {
										store.remove([record.id])
									}
								})
							}
						} catch (e) {
							console.error(e)
							store.put([])
							socket.send(JSON.stringify({ clientId, type: 'recovery' }))
						}
						break
					}
					case 'presence': {
						for (const presence of data.updates) {
							store.mergeRemoteChanges(() => {
								store.put([presence])
							})
						}
						break
					}
				}
			} catch (e) {
				console.error(e)
			}
		},
		onClose(event: CloseEvent) {
			setStoreWithStatus({
				status: 'synced-remote',
				connectionStatus: 'offline',
				store,
			})

			if (event.code === 1011 && event.reason.includes('403')) {
				socket.close()
				toast.error(`当前房间最多只允许2个用户同时访问。正在进入新的房间...`, {
					onClose: () => {
						window.location.href = HOME_PAGE
					},
				})
				return
			}
		},
		onError(event) {
			console.log('on error', event)
		},
	})

	useEffect(() => {
		const pendingChanges: HistoryEntry<TLRecord>[] = []
		const pendingPresences: TLInstancePresence[] = []

		const sendChanges = throttle(() => {
			if (pendingChanges.length === 0) return
			socket.send(
				JSON.stringify({
					clientId,
					type: 'update',
					updates: pendingChanges,
				}))
			pendingChanges.length = 0
		}, 32)

		const sendPresences = throttle(() => {
			if (pendingPresences.length === 0) return
			socket.send(
				JSON.stringify({
					clientId,
					type: 'presence',
					updates: pendingPresences,
				}))
			pendingPresences.length = 0
		}, 32)

		const handleChange: StoreListener<TLRecord> = (event) => {
			if (event.source !== 'user') return
			pendingChanges.push(event)
			sendChanges()
		}

		const unListen = store.listen(handleChange, {
			source: 'user',
			scope: 'document',
		})

		const userPreferences = computed<{
			id: string
			color: string
			name: string
		}>('userPreferences', () => {
			const user = getUserPreferences()
			return {
				id: user.id,
				color: user.color ?? defaultUserPreferences.color,
				name: user.name ?? defaultUserPreferences.name,
			}
		})

		// Create the instance presence derivation
		const presenceId = InstancePresenceRecordType.createId(clientId)
		const presenceDerivation = createPresenceStateDerivation(
			userPreferences,
			presenceId,
		)(store)


		const unsub = react('update presence', () => {
			const presence = presenceDerivation.get()
			if (presence) {
				pendingPresences.push(presence)
				sendPresences()
			}
		})

		return () => {
			unListen()
			unsub()
			socket.close()
		}
	}, [store, socket])

	return storeWithStatus
}
