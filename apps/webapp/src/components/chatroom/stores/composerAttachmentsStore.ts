import { deleteChatMediaFromStorage } from '@components/chatroom/utils/uploadChatMedia'
import type { MessageMediaItem } from '@types'
import { create } from 'zustand'

export type ComposerAttachment = {
  id: string
  file?: File
  item?: MessageMediaItem
  status: 'uploading' | 'ready' | 'error' | 'expired'
  progress?: number
  error?: string
  /** Row-backed media — do not delete storage on composer clear/cancel. */
  persisted?: boolean
  spoiler?: boolean
}

const emptyAttachments: ComposerAttachment[] = []

export const composerAttachmentKey = (
  workspaceId: string | undefined,
  channelId: string
): string => (workspaceId ? `${workspaceId}::${channelId}` : channelId)

export const composerEditAttachmentKey = (draftKey: string): string => `${draftKey}::edit`

type ComposerAttachmentsState = {
  byKey: Record<string, ComposerAttachment[]>
  removedPersistedByKey: Record<string, string[]>
  modeAddedByKey: Record<string, string[]>
  setAttachments: (
    key: string,
    next: ComposerAttachment[] | ((prev: ComposerAttachment[]) => ComposerAttachment[])
  ) => void
  takeRemovedPersistedPaths: (key: string) => string[]
  pushRemovedPersistedPath: (key: string, path: string) => void
  resetRemovedPersistedPaths: (key: string) => void
  takeModeAddedIds: (key: string) => string[]
  pushModeAddedId: (key: string, id: string) => void
  pruneExceptKeys: (keepKeys: string[]) => void
}

export const selectComposerAttachmentsByKey =
  (key: string) =>
  (state: ComposerAttachmentsState): ComposerAttachment[] =>
    state.byKey[key] ?? emptyAttachments

const pickKeys = <T>(record: Record<string, T>, keys: string[]): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => keys.includes(key)))

export const useComposerAttachmentsStore = create<ComposerAttachmentsState>((set, get) => ({
  byKey: {},
  removedPersistedByKey: {},
  modeAddedByKey: {},

  setAttachments: (key, next) => {
    set((state) => {
      const prev = state.byKey[key] ?? []
      const resolved = typeof next === 'function' ? next(prev) : next
      return { byKey: { ...state.byKey, [key]: resolved } }
    })
  },

  takeRemovedPersistedPaths: (key) => {
    const paths = get().removedPersistedByKey[key] ?? []
    if (paths.length === 0) return []
    set((state) => ({
      removedPersistedByKey: { ...state.removedPersistedByKey, [key]: [] }
    }))
    return paths
  },

  pushRemovedPersistedPath: (key, path) => {
    set((state) => ({
      removedPersistedByKey: {
        ...state.removedPersistedByKey,
        [key]: [...(state.removedPersistedByKey[key] ?? []), path]
      }
    }))
  },

  resetRemovedPersistedPaths: (key) => {
    set((state) => ({
      removedPersistedByKey: { ...state.removedPersistedByKey, [key]: [] }
    }))
  },

  takeModeAddedIds: (key) => {
    const ids = get().modeAddedByKey[key] ?? []
    if (ids.length === 0) return []
    set((state) => ({
      modeAddedByKey: { ...state.modeAddedByKey, [key]: [] }
    }))
    return ids
  },

  pushModeAddedId: (key, id) => {
    set((state) => ({
      modeAddedByKey: {
        ...state.modeAddedByKey,
        [key]: [...(state.modeAddedByKey[key] ?? []), id]
      }
    }))
  },

  pruneExceptKeys: (keepKeys) => {
    set((state) => ({
      byKey: pickKeys(state.byKey, keepKeys),
      removedPersistedByKey: pickKeys(state.removedPersistedByKey, keepKeys),
      modeAddedByKey: pickKeys(state.modeAddedByKey, keepKeys)
    }))
  }
}))

export const deleteNonPersistedAttachmentStorage = (attachments: ComposerAttachment[]) => {
  for (const attachment of attachments) {
    if (attachment.item && attachment.status === 'ready' && !attachment.persisted) {
      void deleteChatMediaFromStorage(attachment.item)
    }
  }
}
