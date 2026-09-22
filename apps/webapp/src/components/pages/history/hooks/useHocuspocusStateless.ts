import { useStore } from '@stores'
import { shouldShowSyncErrorWhileLoading } from '@utils/providerCollabStatus'
import { useLayoutEffect } from 'react'

import { resetHistorySessionForMount } from '../clearHistorySession'
import { parseHistoryHash } from '../historyShareUrl'
import { useDocumentHistory } from './useDocumentHistory'
import { useHistoryEditorApplyWhenReady } from './useHistoryEditorApplyWhenReady'
import { useStatelessMessage } from './useStatelessMessage'

export const useHocuspocusStateless = () => {
  const hocuspocusProvider = useStore((state) => state.settings.hocuspocusProvider)
  const documentId = useStore((state) => state.settings.metadata?.documentId)
  const providerSyncing = useStore((state) => state.settings.editor.providerSyncing)
  const providerStatus = useStore((state) => state.settings.providerStatus)
  const setLoadingHistory = useStore((state) => state.setLoadingHistory)
  const { handleStatelessMessage } = useStatelessMessage()
  const { fetchHistory } = useDocumentHistory()

  useHistoryEditorApplyWhenReady()

  useLayoutEffect(() => {
    resetHistorySessionForMount()
  }, [hocuspocusProvider, documentId])

  useLayoutEffect(() => {
    if (!providerSyncing) return
    if (!shouldShowSyncErrorWhileLoading(providerStatus)) return
    setLoadingHistory(false)
  }, [providerSyncing, providerStatus, setLoadingHistory])

  useLayoutEffect(() => {
    if (!hocuspocusProvider) return
    // A digest View link carries the window the mail described. Set it before
    // the list request, which includes that row when it sits off the first page.
    const since = parseHistoryHash(window.location.hash).since
    if (since) useStore.getState().setPendingCompareSince(since)
    hocuspocusProvider.on('stateless', handleStatelessMessage)
    fetchHistory()

    return () => {
      hocuspocusProvider.off('stateless', handleStatelessMessage)
    }
  }, [hocuspocusProvider, handleStatelessMessage, fetchHistory])
}
