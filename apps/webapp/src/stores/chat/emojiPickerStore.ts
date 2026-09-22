import type { TMsgRow } from '@types'
import { immer } from 'zustand/middleware/immer'

export type EmojiPickerPosition = {
  top: number
  left: number
}

export type EmojiPickerEventType = 'reactToMessage' | 'insertEmojiToEditor'

type EmojiPickerState = {
  isOpen: boolean
  position: EmojiPickerPosition
  selectedMessage: TMsgRow | null
  eventType: EmojiPickerEventType | null
}

interface IEmojiPickerStore {
  emojiPicker: EmojiPickerState
  openEmojiPicker: (
    position: EmojiPickerPosition,
    eventType: EmojiPickerEventType,
    message?: TMsgRow
  ) => void
  closeEmojiPicker: () => void
}

const emojiPickerStore = immer<IEmojiPickerStore>((set, _get) => ({
  emojiPicker: {
    isOpen: false,
    position: { top: 0, left: 0 },
    selectedMessage: null,
    eventType: null
  },

  openEmojiPicker: (position, eventType, message) => {
    set((state) => {
      state.emojiPicker = {
        isOpen: true,
        position,
        eventType,
        selectedMessage: message ?? null
      }
    })
  },

  closeEmojiPicker: () => {
    set((state) => {
      state.emojiPicker = {
        isOpen: false,
        position: { top: 0, left: 0 },
        selectedMessage: null,
        eventType: null
      }
    })
  }
}))

export default emojiPickerStore
