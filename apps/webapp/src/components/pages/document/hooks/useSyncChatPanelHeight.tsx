import { useChatStore } from '@stores'
import { RefObject, useEffect, useLayoutEffect, useRef } from 'react'

const writeChatPanelHeight = (
  editorWrapper: HTMLDivElement,
  height: number,
  editorEl: HTMLElement | null
) => {
  const editor = editorEl ?? editorWrapper.closest('.editor')
  if (editor instanceof HTMLElement) {
    editor.style.setProperty('--chat-panel-height', `${height}px`)
    return editor
  }
  return null
}

export const useSyncChatPanelHeight = (editorWrapperRef: RefObject<HTMLDivElement | null>) => {
  const panelHeight = useChatStore((state) => state.chatRoom.panelHeight)
  const documentId = useChatStore((state) => state.chatRoom.documentId)
  const editorElRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const editorWrapper = editorWrapperRef.current
    if (!editorWrapper) return
    const height = documentId ? panelHeight : 0
    editorElRef.current = writeChatPanelHeight(editorWrapper, height, editorElRef.current)
  }, [editorWrapperRef, panelHeight, documentId])

  useEffect(() => {
    const onTick = (e: Event) => {
      const editorWrapper = editorWrapperRef.current
      if (!editorWrapper) return
      const height = (e as CustomEvent<number>).detail
      if (typeof height !== 'number') return
      editorElRef.current = writeChatPanelHeight(editorWrapper, height, editorElRef.current)
    }
    window.addEventListener('chat-panel-resize-tick', onTick)
    return () => {
      window.removeEventListener('chat-panel-resize-tick', onTick)
    }
  }, [editorWrapperRef])
}
