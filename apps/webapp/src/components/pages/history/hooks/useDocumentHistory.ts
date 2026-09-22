import { sendHistoryListRequest } from '@components/pages/history/historyStatelessWire'
import { useStore } from '@stores'
import { useCallback } from 'react'

export const useDocumentHistory = () => {
  const hocuspocusProvider = useStore((state) => state.settings.hocuspocusProvider)
  const documentId = useStore((state) => state.settings.metadata?.documentId)
  const setLoadingHistory = useStore((state) => state.setLoadingHistory)
  const setSilentListRefresh = useStore((state) => state.setSilentListRefresh)

  const fetchHistory = useCallback(() => {
    if (!hocuspocusProvider) return
    // A silent reply that never landed would latch the flag and make this foreground
    // list return early without hydrating — spinner up, nothing behind it.
    setSilentListRefresh(false)
    setLoadingHistory(true)
    sendHistoryListRequest(hocuspocusProvider, documentId, {
      since: useStore.getState().pendingCompareSince
    })
  }, [hocuspocusProvider, documentId, setLoadingHistory, setSilentListRefresh])

  const fetchOlderHistory = useCallback(() => {
    if (!hocuspocusProvider) return
    const beforeVersion = useStore.getState().historyNextBefore
    if (beforeVersion == null) return
    sendHistoryListRequest(hocuspocusProvider, documentId, { beforeVersion })
  }, [hocuspocusProvider, documentId])

  return { fetchHistory, fetchOlderHistory }
}
