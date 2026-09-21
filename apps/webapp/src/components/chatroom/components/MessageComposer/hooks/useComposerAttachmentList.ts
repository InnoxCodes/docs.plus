import {
  composerAttachmentKey,
  composerEditAttachmentKey,
  selectComposerAttachmentsByKey,
  useComposerAttachmentsStore
} from '@components/chatroom/stores/composerAttachmentsStore'
import { useChatStore } from '@stores'

/** Store-only attachment list for UI that must not subscribe via MessageComposerContext. */
export const useComposerAttachmentList = (workspaceId: string | undefined, channelId: string) => {
  const draftKey = composerAttachmentKey(workspaceId, channelId)
  const editing = useChatStore((state) =>
    Boolean(state.workspaceSettings.channels.get(channelId)?.editMessageMemory)
  )
  return useComposerAttachmentsStore(
    selectComposerAttachmentsByKey(editing ? composerEditAttachmentKey(draftKey) : draftKey)
  )
}
