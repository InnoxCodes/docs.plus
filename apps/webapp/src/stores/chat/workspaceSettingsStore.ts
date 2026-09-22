import { CommentMessageMemory, ComposerMessageMemory, TChannelSettings } from '@types'
import { immer } from 'zustand/middleware/immer'

type WorkspaceSettings = {
  workspaceId?: string
  workspaceBroadcaster?: any
  channels: Map<string, TChannelSettings>
}

export interface IWorkspaceSettingsStore {
  workspaceSettings: WorkspaceSettings
  setWorkspaceChannelSetting: (channelId: string, key: keyof TChannelSettings, value: any) => void
  setWorkspaceSetting: (key: keyof WorkspaceSettings, value: any) => void
  setCommentMessageMemory: (channelId: string, message: CommentMessageMemory | null) => void
  setReplyMessageMemory: (channelId: string, message: ComposerMessageMemory | null) => void
  setEditMessageMemory: (channelId: string, message: ComposerMessageMemory | null) => void
  clearMemoryStates: (channelId: string) => void
}

const useWorkspaceSettingsStore = immer<IWorkspaceSettingsStore>((set) => ({
  workspaceSettings: {
    workspaceId: undefined,
    workspaceBroadcaster: undefined,
    channels: new Map()
  },

  setWorkspaceChannelSetting: (channelId, key, value) => {
    set((state) => {
      const channelSettings =
        state.workspaceSettings.channels.get(channelId) || ({} as TChannelSettings)
      channelSettings[key] = value
      state.workspaceSettings.channels.set(channelId, channelSettings)
    })
  },

  setWorkspaceSetting: (key, value) => {
    set((state) => {
      state.workspaceSettings[key] = value
    })
  },

  setCommentMessageMemory: (channelId, message) => {
    setMemory(set, 'commentMessageMemory', channelId, message)
  },

  setReplyMessageMemory: (channelId, message) => {
    setMemory(set, 'replyMessageMemory', channelId, message)
  },

  setEditMessageMemory: (channelId, message) => {
    setMemory(set, 'editMessageMemory', channelId, message)
  },

  clearMemoryStates: (channelId) => {
    set((state: any) => {
      const channelSettings = state.workspaceSettings.channels.get(channelId) || {}
      channelSettings.replyMessageMemory = null
      channelSettings.editMessageMemory = null
      channelSettings.commentMessageMemory = null
      state.workspaceSettings.channels.set(channelId, channelSettings)
    })
  }
}))

function setMemory(set: any, memoryType: string, channelId: string, message: any) {
  set((state: any) => {
    const channelSettings = state.workspaceSettings.channels.get(channelId) || {}
    // One memory slot at a time — clear the others first.
    channelSettings.replyMessageMemory = null
    channelSettings.editMessageMemory = null
    channelSettings.commentMessageMemory = null
    channelSettings[memoryType] = message
    state.workspaceSettings.channels.set(channelId, channelSettings)
  })
}

export default useWorkspaceSettingsStore
