import {
	Tldraw, track, useEditor, AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLAssetId,
	getHashForString,
	uniqueId,
} from 'tldraw'
import { useCallback } from 'react'

import 'tldraw/tldraw.css'
import { useSyncStore } from './useSyncStore'

const HOST_URL = 'ws://localhost:1999'
const API_URL = 'http://localhost:1998'
export default function Room() {
	const roomId = window.location.pathname.slice(1)

	const handleMount = useCallback((editor: Editor) => {
		const shapeIds = editor.getCurrentPageShapes()
		if (shapeIds.length === 0) {
			const assetId: TLAssetId = AssetRecordType.createId('bitiful-desc-image')
			const imageWidth = 884 / 2
			const imageHeight = 560 / 2
			editor.createAssets([{
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'bitiful-desc-image',
					src: 'https://bitiful-contents.s3.bitiful.net/images/Background-logo.png?w=1280&fm=webp',
					w: imageWidth,
					h: imageHeight,
					mimeType: 'image/webp',
					isAnimated: false,
				},
				meta: {},
			}])

			editor.createShape({
				type: 'image',
				x: (window.innerWidth - imageWidth) / 2,
				y: (window.innerHeight - imageHeight) / 2,
				props: {
					assetId,
					w: imageWidth,
					h: imageHeight,
				},
			})
		}

		editor.registerExternalAssetHandler(
			'file',
			async ({ file }: { type: 'file'; file: File }) => {
				// only allow images and videos
				if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
					return Promise.reject({} as TLAsset)
				}

				const id = uniqueId()
				const now = new Date()
				const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDay()}-${now.getHours()}`
				const objectKey = `${date}-${roomId}-${id}`

				// get presigned url
				let presignedGetUrl: string
				let presignedPutUrl: string

				try {
					const uploadUrl = `${API_URL}/presigned-url?key=${objectKey}`
					const response = await fetch(uploadUrl)
					if (!response.ok) {
						return Promise.reject({} as TLAsset)
					}
					const result = await response.json()
					presignedGetUrl = result['get-url']
					presignedPutUrl = result['put-url']
				} catch (e) {
					return Promise.reject({} as TLAsset)
				}

				// async upload the file
				fetch(presignedPutUrl, {
					method: 'PUT',
					body: file,
				})
					.then((res) => {
						console.log('upload ok resp=', res)
					})
					.catch((err) => {
						console.log('upload err', err)
					})

				const assetId: TLAssetId = AssetRecordType.createId(
					getHashForString(presignedGetUrl),
				)

				let size: {
					w: number;
					h: number;
				}
				let isAnimated: boolean
				let shapeType: 'image' | 'video'

				if (file.type.startsWith('image/')) {
					shapeType = 'image'
					size = await MediaHelpers.getImageSize(file)
					isAnimated = false
				} else if (file.type.startsWith('video/')) {
					shapeType = 'video'
					isAnimated = true
					size = await MediaHelpers.getVideoSize(file)
				} else {
					return Promise.reject({} as TLAsset)
				}
				size = toSmallSize(size)

				const asset: TLAsset = AssetRecordType.create({
					id: assetId,
					type: shapeType,
					typeName: 'asset',
					props: {
						name: file.name,
						src: presignedGetUrl,
						w: size.w,
						h: size.h,
						mimeType: file.type,
						isAnimated,
					},
				})

				return asset
			},
		)
	}, [])

	const toSmallSize = (size: { w: number; h: number }) => {
		const max = Math.max(size.w, size.h)
		if (max > 300) {
			const ratio = 300 / max
			return {
				w: size.w * ratio,
				h: size.h * ratio,
			}
		}
		return size
	}

	const store = useSyncStore({
		roomId: roomId,
		hostUrl: HOST_URL,
	})

	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				store={store}
				components={{
					SharePanel: NameEditor,
					DebugPanel: null,
				}}
				onMount={handleMount}
				// only allow jpegs
				acceptedImageMimeTypes={['image/jpeg', 'image/png', 'image/webp']}
				// don't allow any videos
				acceptedVideoMimeTypes={['video/mp4', 'video/webm', 'video/quicktime']}
				// accept images of any dimension
				maxImageDimension={Infinity}
				// ...but only accept assets up to 1GB
				maxAssetSize={1024 * 1024 * 1024}
			/>
		</div>
	)
}

const NameEditor = track(() => {
	const editor = useEditor()
	const { color, name } = editor.user.getUserPreferences()

	return (
		<div style={{ display: 'flex', alignItems: 'center' }}>
			<div style={{ marginRight: '10px', display: 'flex' }}>
				<svg width="70" viewBox="0 0 495 204" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M63.57 164.793C59.658 164.793 55.909 164.25 52.323 163.163C48.737 162.076 45.477 160.609 42.543 158.762C39.7177 156.915 37.327 154.796 35.371 152.405C33.5237 149.906 32.274 147.352 31.622 144.744L37.327 142.788L35.86 162.837H11.573V42.38H37.816V97.148L32.437 95.192C33.089 92.3667 34.3387 89.7587 36.186 87.368C38.0333 84.8687 40.3697 82.6953 43.195 80.848C46.0203 78.892 49.1173 77.3707 52.486 76.284C55.8547 75.1973 59.332 74.654 62.918 74.654C70.416 74.654 77.0447 76.61 82.804 80.522C88.672 84.3253 93.2903 89.65 96.659 96.496C100.028 103.233 101.712 110.949 101.712 119.642C101.712 128.444 100.028 136.268 96.659 143.114C93.399 149.851 88.8893 155.176 83.13 159.088C77.3707 162.891 70.8507 164.793 63.57 164.793ZM56.724 142.788C60.636 142.788 64.059 141.81 66.993 139.854C69.927 137.898 72.1547 135.236 73.676 131.867C75.306 128.39 76.121 124.315 76.121 119.642C76.121 115.078 75.306 111.057 73.676 107.58C72.1547 104.103 69.927 101.44 66.993 99.593C64.059 97.7457 60.636 96.822 56.724 96.822C52.7033 96.822 49.226 97.7457 46.292 99.593C43.358 101.44 41.076 104.103 39.446 107.58C37.816 111.057 37.001 115.078 37.001 119.642C37.001 124.315 37.816 128.39 39.446 131.867C41.076 135.236 43.358 137.898 46.292 139.854C49.226 141.81 52.7033 142.788 56.724 142.788ZM120.327 163V76.447H146.407V163H120.327ZM133.367 59.332C128.477 59.332 124.619 58.191 121.794 55.909C119.077 53.5183 117.719 50.1497 117.719 45.803C117.719 41.891 119.132 38.6853 121.957 36.186C124.782 33.6867 128.586 32.437 133.367 32.437C138.257 32.437 142.06 33.6323 144.777 36.023C147.494 38.305 148.852 41.565 148.852 45.803C148.852 49.8237 147.439 53.0837 144.614 55.583C141.897 58.0823 138.148 59.332 133.367 59.332ZM178.084 163V54.605H204.164V163H178.084ZM162.762 99.267V76.447H220.953V99.267H162.762ZM237.324 163V76.447H263.404V163H237.324ZM250.364 59.332C245.474 59.332 241.617 58.191 238.791 55.909C236.075 53.5183 234.716 50.1497 234.716 45.803C234.716 41.891 236.129 38.6853 238.954 36.186C241.78 33.6867 245.583 32.437 250.364 32.437C255.254 32.437 259.058 33.6323 261.774 36.023C264.491 38.305 265.849 41.565 265.849 45.803C265.849 49.8237 264.437 53.0837 261.611 55.583C258.895 58.0823 255.146 59.332 250.364 59.332ZM293.288 163V72.209C293.288 66.5583 294.483 61.451 296.874 56.887C299.373 52.323 302.796 48.737 307.143 46.129C311.598 43.4123 316.76 42.054 322.628 42.054C326.757 42.054 330.561 42.6517 334.038 43.847C337.515 45.0423 340.612 46.7267 343.329 48.9L335.831 67.971C334.418 67.2103 333.06 66.6127 331.756 66.178C330.452 65.7433 329.257 65.526 328.17 65.526C326.214 65.526 324.584 65.852 323.28 66.504C321.976 67.156 320.998 68.1883 320.346 69.601C319.803 70.905 319.531 72.535 319.531 74.491V163H306.491C303.557 163 300.949 163 298.667 163C296.494 163 294.701 163 293.288 163ZM280.737 100.408V78.892H337.298V100.408H280.737ZM381.402 164.793C374.991 164.793 369.503 163.435 364.939 160.718C360.484 157.893 357.007 153.872 354.507 148.656C352.117 143.44 350.921 137.192 350.921 129.911V76.447H377.164V126.325C377.164 129.802 377.708 132.791 378.794 135.29C379.881 137.789 381.511 139.745 383.684 141.158C385.858 142.462 388.466 143.114 391.508 143.114C393.79 143.114 395.855 142.734 397.702 141.973C399.658 141.212 401.288 140.18 402.592 138.876C404.005 137.463 405.092 135.888 405.852 134.149C406.613 132.302 406.993 130.291 406.993 128.118V76.447H433.236V163H408.623L407.482 145.233L412.372 143.277C411.068 147.406 408.895 151.101 405.852 154.361C402.81 157.512 399.169 160.066 394.931 162.022C390.693 163.869 386.184 164.793 381.402 164.793ZM456.643 163V42.38H482.723V163H456.643Z"
						fill="black"></path>
					<path
						d="M152 48.5C152 59.2696 143.27 68 132.5 68C121.73 68 113 59.2696 113 48.5C113 37.7304 121.73 29 132.5 29C143.27 29 152 37.7304 152 48.5Z"
						fill="#00E9E9"></path>
					<circle cx="250.5" cy="48.5" r="19.5" fill="#00DD66"></circle>
				</svg>
			</div>

			<div style={{ marginRight: '10px', display: 'flex', cursor: 'pointer', pointerEvents: 'all' }} onClick={() => {
				window.open('https://github.com/bitiful/tldraw-no-wait-transfer-example')
			}}>
				<svg width="22" height="22" aria-hidden="true" viewBox="0 0 16 16" version="1.1" data-view-component="true">
					<path
						d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
				</svg>
			</div>

			<div style={{
				pointerEvents: 'all',
				display: 'flex',
				border: '1px solid #ddd',
			}}>
				<input
					type="color"
					value={color}
					style={{ border: 'none' }}
					onChange={(e) => {
						editor.user.updateUserPreferences({
							color: e.currentTarget.value,
						})
					}}
				/>
				<input
					style={{ width: '105px', border: 'none' }}
					value={name}
					onChange={(e) => {
						editor.user.updateUserPreferences({
							name: e.currentTarget.value,
						})
					}}
				/>
			</div>
		</div>
	)
})
