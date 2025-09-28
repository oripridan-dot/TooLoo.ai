import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketIO = io({
      transports: ['websocket', 'polling']
    })

    setSocket(socketIO)

    socketIO.on('connect', () => {
      console.log('Connected to TooLoo.ai server')
    })

    socketIO.on('disconnect', () => {
      console.log('Disconnected from TooLoo.ai server')
    })

    return () => {
      socketIO.disconnect()
    }
  }, [])

  return socket
}