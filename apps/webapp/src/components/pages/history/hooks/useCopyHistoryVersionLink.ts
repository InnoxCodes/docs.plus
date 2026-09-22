import {
  copyHistoryVersionLinkToClipboard,
  copyVersionLinkTitle
} from '@components/pages/history/historyShareUrl'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCopyHistoryVersionLink(
  version: number | undefined,
  createdAt: string | undefined
) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const copy = useCallback(async () => {
    if (version == null) return

    const ok = await copyHistoryVersionLinkToClipboard(version)
    if (!ok) return

    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [version])

  const idleLabel = createdAt ? copyVersionLinkTitle(createdAt) : 'Copy link'

  return { copy, copied, label: copied ? 'Copied!' : idleLabel }
}
