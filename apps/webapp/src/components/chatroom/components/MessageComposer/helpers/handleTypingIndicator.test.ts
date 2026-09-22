import type { TypingIndicatorPayload } from '@types'

import type * as Sender from './handleTypingIndicator'

const mockSend = jest.fn((_message: { payload: TypingIndicatorPayload }) => Promise.resolve())

jest.mock('@stores', () => ({
  useStore: { getState: () => ({ settings: { broadcaster: { send: mockSend } } }) },
  useAuthStore: { getState: () => ({ profile: { id: 'user-1' } }) }
}))

const sent = () =>
  mockSend.mock.calls.map(([{ payload }]) =>
    payload.activity ? `${payload.type}:${payload.activity}` : payload.type
  )

const setHidden = (hidden: boolean) =>
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })

// The sender keeps module state, so each test loads a fresh copy.
let sender: typeof Sender

beforeEach(async () => {
  jest.useFakeTimers()
  mockSend.mockClear()
  setHidden(false)
  await jest.isolateModulesAsync(async () => {
    sender = await import('./handleTypingIndicator')
  })
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe('composer activity sender', () => {
  it('sends startActivity after 300 ms, and a quicker open and close sends nothing', () => {
    sender.startComposerActivity('choosingEmoji')
    jest.advanceTimersByTime(299)
    sender.stopComposerActivity('choosingEmoji')
    jest.advanceTimersByTime(10_000)
    expect(sent()).toEqual([])

    sender.startComposerActivity('recordingVoice')
    jest.advanceTimersByTime(299)
    expect(sent()).toEqual([])
    jest.advanceTimersByTime(1)
    expect(sent()).toEqual(['startActivity:recordingVoice'])
  })

  it('makes typing yield: stopTyping once, no late debounced stop, and typing restarts after', () => {
    const { handleTypingIndicator, TypingIndicatorType } = sender
    handleTypingIndicator(TypingIndicatorType.StartTyping)
    sender.startComposerActivity('choosingEmoji')
    jest.advanceTimersByTime(300)
    expect(sent()).toEqual(['startTyping', 'stopTyping', 'startActivity:choosingEmoji'])

    // An emoji insert fires onUpdate while the picker is open.
    handleTypingIndicator(TypingIndicatorType.StartTyping)
    jest.advanceTimersByTime(2000)
    expect(sent()).toEqual(['startTyping', 'stopTyping', 'startActivity:choosingEmoji'])

    sender.stopComposerActivity('choosingEmoji')
    handleTypingIndicator(TypingIndicatorType.StartTyping)
    expect(sent().slice(3)).toEqual(['stopActivity:choosingEmoji', 'startTyping'])
  })

  it('resends the start every 3 s, and skips a resend while the tab is hidden', () => {
    sender.startComposerActivity('recordingVoice')
    jest.advanceTimersByTime(300 + 3000)
    expect(sent()).toEqual(['startActivity:recordingVoice', 'startActivity:recordingVoice'])

    setHidden(true)
    jest.advanceTimersByTime(3000)
    expect(sent()).toHaveLength(2)

    setHidden(false)
    jest.advanceTimersByTime(3000)
    expect(sent()).toHaveLength(3)
  })

  it('ignores a stop for another activity, and stops the keepalive on its own stop', () => {
    sender.startComposerActivity('choosingEmoji')
    jest.advanceTimersByTime(300)
    sender.stopComposerActivity('recordingVoice')
    jest.advanceTimersByTime(3000)
    expect(sent()).toEqual(['startActivity:choosingEmoji', 'startActivity:choosingEmoji'])

    sender.stopComposerActivity('choosingEmoji')
    sender.stopComposerActivity('choosingEmoji')
    jest.advanceTimersByTime(10_000)
    expect(sent().slice(2)).toEqual(['stopActivity:choosingEmoji'])
  })
})
