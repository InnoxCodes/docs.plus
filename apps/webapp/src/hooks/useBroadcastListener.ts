import { useStore } from '@stores'
import { useEffect, useRef } from 'react'

type TTypingUser = {
  id: string
  displayName?: string | null
}

type TTypeIndicator = {
  event: 'typingIndicator'
  type: 'broadcast'
  payload: {
    activeChannelId: string
    user: TTypingUser
    type: 'startTyping' | 'stopTyping'
  }
}

export const useBroadcastListener = (enabled = true) => {
  const broadcaster = useStore((state) => state.settings.broadcaster)
  const updateUserStatus = useStore((state) => state.updateUserStatus)

  const registered = useRef(false)

  useEffect(() => {
    if (!enabled || !broadcaster || registered.current) return
    registered.current = true

    broadcaster.on('broadcast', { event: 'typingIndicator' }, (data: TTypeIndicator) => {
      const payload = data.payload
      if (payload.type === 'startTyping') {
        updateUserStatus(payload.user.id, 'TYPING')
      } else if (payload.type === 'stopTyping') {
        updateUserStatus(payload.user.id, 'ONLINE')
      }
    })

    return () => {
      registered.current = false
    }
  }, [enabled, broadcaster, updateUserStatus])
}
