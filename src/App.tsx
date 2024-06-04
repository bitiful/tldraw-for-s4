import { Routes, Route, Link } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Room from './Room'
import { useEffect } from 'react'

export default function App() {
	return (
		<div>
			<ToastContainer
				position="top-center" autoClose={5000} theme="dark" progressStyle={{ backgroundColor: '#00E468' }} />
			<Routes>
				<Route index element={<Home />} />
				<Route path="/:roomId" element={<Room />} />
				<Route path="*" element={<NoMatch />} />
			</Routes>
		</div>
	)
}

function Home() {
	function generateRoomId(length: number) {
		return Math.random().toString(36).substring(2, 2 + length)
	}

	useEffect(() => {
		const roomId = generateRoomId(10)
		setTimeout(() => {
			window.location.href = '/' + roomId
		}, 1500)
	}, [])

	return <div style={{ textAlign: 'center', marginTop: '100px' }}>
		<h1>自动分配房间中...</h1>
	</div>
}

function NoMatch() {
	return (
		<div>
			<h2>Nothing to see here!</h2>
			<p>
				<Link to="/">Go to the home page</Link>
			</p>
		</div>
	)
}