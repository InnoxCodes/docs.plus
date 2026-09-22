import { useStore } from '@stores'
import type { PresenceActivity, TypingIndicatorPayload } from '@types'
import { useEffect } from 'react'

// Must stay above two sender keepalives (2 × 3 s), so one lost resend keeps the chip.
const ACTIVITY_EXPIRY_MS = 8000

// A Record makes a new PresenceActivity fail to compile until it is listed here.
const KNOWN_ACTIVITIES: Record<PresenceActivity, true> = {
  choosingEmoji: true,
  recordingVoice: true
}

const activityExpiries = new Map<string, ReturnType<typeof setTimeout>>()

export const useBroadcastListener = (enabled = true) => {
  const broadcaster = useStore((state) => state.settings.broadcaster)
  const updateUserStatus = useStore((state) => state.updateUserStatus)
  const setUserActivity = useStore((state) => state.setUserActivity)

  useEffect(() => {
    if (!enabled || !broadcaster) return

    const clearActivity = (userId: string) => {
      clearTimeout(activityExpiries.get(userId))
      activityExpiries.delete(userId)
      setUserActivity(userId)
    }

    broadcaster.on(
      'broadcast',
      { event: 'typingIndicator' },
      ({ payload }: { payload: TypingIndicatorPayload }) => {
        const userId = payload.user.id
        if (payload.type === 'startTyping') {
          updateUserStatus(userId, 'TYPING')
        } else if (payload.type === 'stopTyping') {
          updateUserStatus(userId, 'ONLINE')
        } else if (
          payload.type === 'startActivity' &&
          payload.activity !== undefined &&
          Object.hasOwn(KNOWN_ACTIVITIES, payload.activity)
        ) {
          // The value comes from another client: drop an activity this build does not know.
          setUserActivity(userId, payload.activity)
          clearTimeout(activityExpiries.get(userId))
          activityExpiries.set(
            userId,
            setTimeout(() => clearActivity(userId), ACTIVITY_EXPIRY_MS)
          )
        } else if (payload.type === 'stopActivity') {
          clearActivity(userId)
        }
      }
    )

    return () => {
      for (const userId of activityExpiries.keys()) clearActivity(userId)
    }
  }, [enabled, broadcaster, updateUserStatus, setUserActivity])
}
