import { useChatStore } from '@stores'
import { MOTION_PANEL_MS, prefersReducedMotion } from '@utils/motion'
import { RefObject, useEffect, useRef } from 'react'

// Matches the chat panel's 200ms entry fade; suspended while the handle drags.
const MARGIN_TRANSITION = `margin-bottom ${MOTION_PANEL_MS}ms ease-out`

const writeChatHeight = (
  editorWrapper: HTMLDivElement,
  height: number,
  editorEl: HTMLElement | null
) => {
  editorWrapper.style.marginBottom = `${height}px`
  const editor = editorEl ?? editorWrapper.closest('.editor')
  if (editor instanceof HTMLElement) {
    editor.style.setProperty('--chat-panel-height', `${height}px`)
    return editor
  }
  return null
}

export const useAdjustEditorSizeForChatRoom = (
  editorWrapperRef: RefObject<HTMLDivElement | null>
) => {
  const panelHeight = useChatStore((state) => state.chatRoom.panelHeight)
  const documentId = useChatStore((state) => state.chatRoom.documentId)
  const editorElRef = useRef<HTMLElement | null>(null)

  // Initial mount + post-drag commit: read panelHeight from the store and
  // apply once. Drag-time updates bypass React via the `chat-panel-resize-tick`
  // listener below.
  useEffect(() => {
    const editorWrapper = editorWrapperRef.current

    if (!editorWrapper) return
    // Inline (not a class) so the drag gate below can suspend and restore it.
    editorWrapper.style.transition = prefersReducedMotion() ? '' : MARGIN_TRANSITION
    const height = documentId ? panelHeight : 0
    editorElRef.current = writeChatHeight(editorWrapper, height, editorElRef.current)
  }, [editorWrapperRef, panelHeight, documentId])

  // Live drag mirror: `useResizeContainer.doDrag` writes the panel height
  // directly to its container ref and dispatches this event. We mirror to
  // the editor wrapper's marginBottom imperatively so the editor follows
  // the chat panel without a 60×/sec store write + React re-render storm.
  useEffect(() => {
    const onTick = (e: Event) => {
      const editorWrapper = editorWrapperRef.current
      if (!editorWrapper) return
      const height = (e as CustomEvent<number>).detail
      if (typeof height === 'number') {
        editorElRef.current = writeChatHeight(editorWrapper, height, editorElRef.current)
      }
    }
    // Drag gate: kill the open/close transition while the handle drags so the
    // margin tracks the pointer 1:1, then restore it on mouseup.
    const onDragStart = () => {
      const editorWrapper = editorWrapperRef.current
      if (editorWrapper) editorWrapper.style.transition = 'none'
    }
    const onDragEnd = () => {
      const editorWrapper = editorWrapperRef.current
      if (editorWrapper) {
        editorWrapper.style.transition = prefersReducedMotion() ? '' : MARGIN_TRANSITION
      }
    }
    window.addEventListener('chat-panel-resize-tick', onTick)
    window.addEventListener('chat-panel-resize-start', onDragStart)
    window.addEventListener('chat-panel-resize-end', onDragEnd)
    return () => {
      window.removeEventListener('chat-panel-resize-tick', onTick)
      window.removeEventListener('chat-panel-resize-start', onDragStart)
      window.removeEventListener('chat-panel-resize-end', onDragEnd)
    }
  }, [editorWrapperRef])
}
