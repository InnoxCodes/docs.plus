import { useChatMediaGalleryStore } from '@components/chatroom/stores/chatMediaGalleryStore'
import { getDefaultController } from '@docs.plus/extension-hyperlink'
import { useCallback, useEffect } from 'react'

import { useChatroomContext } from '../../../ChatroomContext'
import {
  dismissComposerEmojiOverlays,
  isComposerEmojiOverlayOpen
} from '../helpers/dismissComposerOverlays'
import { isMentionSuggestionPopupVisible } from '../helpers/mentionTypes'
import {
  isComposerLinkDialogOpen,
  useComposerLinkDialogStore
} from '../stores/composerLinkDialogStore'
import { useMessageComposer } from './useMessageComposer'

/** Each surface handles this Escape itself; the popover handles only a key pressed inside it. */
const isEscapeOwnedElsewhere = (target: EventTarget | null): boolean => {
  const linkPopover = getDefaultController().getState()
  return (
    isMentionSuggestionPopupVisible() ||
    useChatMediaGalleryStore.getState().isOpen ||
    (linkPopover.kind === 'mounted' &&
      target instanceof Node &&
      linkPopover.element.contains(target))
  )
}

// Filled in the capture phase, before the picker, the popover, or the gallery can close itself.
const escapesOwnedElsewhere = new WeakSet<KeyboardEvent>()

export const useHandleEscKey = () => {
  const { channelId } = useChatroomContext()
  const {
    editor,
    replyMessageMemory,
    editMessageMemory,
    commentMessageMemory,
    setEditMsgMemory,
    setReplyMsgMemory,
    setCommentMsgMemory
  } = useMessageComposer()

  const handleEsc = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isComposerLinkDialogOpen()) {
          event.preventDefault()
          event.stopPropagation()
          useComposerLinkDialogStore.getState().cancel()
          return
        }

        if (isComposerEmojiOverlayOpen()) {
          event.preventDefault()
          event.stopPropagation()
          dismissComposerEmojiOverlays()
          return
        }

        if (escapesOwnedElsewhere.has(event)) return

        if (replyMessageMemory) setReplyMsgMemory(channelId, null)
        if (editMessageMemory) {
          setEditMsgMemory(channelId, null)
          editor?.commands.clearContent(true)
        }
        if (commentMessageMemory) {
          setCommentMsgMemory(channelId, null)
          editor?.commands.clearContent(true)
        }
      }
    },
    [
      replyMessageMemory,
      editMessageMemory,
      commentMessageMemory,
      channelId,
      editor,
      setEditMsgMemory,
      setReplyMsgMemory,
      setCommentMsgMemory
    ]
  )

  useEffect(() => {
    const recordEscapeOwnedElsewhere = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEscapeOwnedElsewhere(event.target)) {
        escapesOwnedElsewhere.add(event)
      }
    }
    window.addEventListener('keydown', recordEscapeOwnedElsewhere, true)
    return () => {
      window.removeEventListener('keydown', recordEscapeOwnedElsewhere, true)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [handleEsc])
}
