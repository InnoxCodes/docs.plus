import type { ComposerAttachment } from '@components/chatroom/stores/composerAttachmentsStore'
import { useCallback, useEffect, useState } from 'react'

import { useComposerAttachmentActions } from '../context/ComposerAttachmentActionsContext'
import { useMessageComposer } from './useMessageComposer'

/**
 * A released voice note sends like a Send press once its upload is ready. It goes alone:
 * typed text or another tile leaves it in the strip for a manual Send. An error or a removal drops it.
 */
export function useSendVoiceWhenReady(attachments: ComposerAttachment[]) {
  const { addFiles } = useComposerAttachmentActions()
  const { editor, submitMessage } = useMessageComposer()
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingId) return
    const tile = attachments.find((attachment) => attachment.id === pendingId)
    if (tile?.status === 'uploading') return
    setPendingId(null)
    if (tile?.status === 'ready' && attachments.length === 1 && editor?.isEmpty) {
      void submitMessage()
    }
  }, [attachments, editor, pendingId, submitMessage])

  return useCallback((file: File) => setPendingId(addFiles([file])[0] ?? null), [addFiles])
}
