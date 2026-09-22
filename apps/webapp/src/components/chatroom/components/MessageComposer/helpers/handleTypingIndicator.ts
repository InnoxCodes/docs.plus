import { useAuthStore, useStore } from '@stores'
import type { PresenceActivity, TypingIndicatorPayload } from '@types'
import debounce from 'lodash/debounce'

// Enum to represent the different states of typing indicator.
export enum TypingIndicatorType {
  SentMsg = 'SentMsg',
  StartTyping = 'startTyping',
  StopTyping = 'stopTyping'
}

// A quicker open and close sends nothing.
const ACTIVITY_START_DELAY_MS = 300
// Peers expire an activity 8 s after its last start (useBroadcastListener).
// A presence sync also drops it, so the resend brings the chip back.
const ACTIVITY_KEEPALIVE_MS = 3000

// Flag to track if typing has started.
let hasStartedTyping = false

let currentActivity: PresenceActivity | null = null
let activityStartSent = false
let activityStartTimer: ReturnType<typeof setTimeout> | undefined
let activityKeepalive: ReturnType<typeof setInterval> | undefined

const sendTypingIndicator = (type: TypingIndicatorPayload['type'], activity?: PresenceActivity) => {
  const { broadcaster } = useStore.getState().settings
  const profile = useAuthStore.getState().profile
  if (!profile) return

  const payload: TypingIndicatorPayload = {
    type,
    activity,
    user: { id: profile.id }
  }

  // Broadcasting typing indicator event.
  broadcaster
    ?.send({
      type: 'broadcast',
      event: 'typingIndicator',
      payload
    })
    .then()
    .catch(console.error)
}

// Debounce function to limit the frequency of stop typing indicator broadcasts.
const debouncedStopTypingIndicator = debounce(() => {
  sendTypingIndicator(TypingIndicatorType.StopTyping)
  hasStartedTyping = false // Resetting typing start flag.
}, 1000) // Waiting for 1 second of inactivity before stopping the typing indicator.

// Main function to handle typing indicator based on the event type.
export const handleTypingIndicator = (type: TypingIndicatorType) => {
  if (type === TypingIndicatorType.StartTyping) {
    // An emoji insert fires onUpdate; it must not flash "typing" under the chip.
    if (currentActivity) return
    // When user starts typing.
    if (!hasStartedTyping) {
      sendTypingIndicator(type) // Display typing indicator.
      hasStartedTyping = true
    }
    debouncedStopTypingIndicator() // Debounce stopping the indicator.
  } else if (type === TypingIndicatorType.StopTyping) {
    // When user stops typing.
    debouncedStopTypingIndicator() // Debounce stopping the indicator.
  } else if (type === TypingIndicatorType.SentMsg) {
    // When user sends a message.
    debouncedStopTypingIndicator.cancel() // Cancel any pending debounced stop calls.
    sendTypingIndicator(TypingIndicatorType.StopTyping) // Immediately stop typing indicator.
    hasStartedTyping = false
  }
}

export const stopComposerActivity = (activity: PresenceActivity) => {
  if (currentActivity !== activity) return
  currentActivity = null
  clearTimeout(activityStartTimer)
  clearInterval(activityKeepalive)
  if (activityStartSent) sendTypingIndicator('stopActivity', activity)
  activityStartSent = false
}

/** One activity per face, so a new start replaces the current one. */
export const startComposerActivity = (activity: PresenceActivity) => {
  if (currentActivity) stopComposerActivity(currentActivity)
  currentActivity = activity
  activityStartTimer = setTimeout(() => {
    debouncedStopTypingIndicator.cancel()
    if (hasStartedTyping) sendTypingIndicator(TypingIndicatorType.StopTyping)
    hasStartedTyping = false
    sendTypingIndicator('startActivity', activity)
    activityStartSent = true
    activityKeepalive = setInterval(() => {
      if (!document.hidden) sendTypingIndicator('startActivity', activity)
    }, ACTIVITY_KEEPALIVE_MS)
  }, ACTIVITY_START_DELAY_MS)
}
