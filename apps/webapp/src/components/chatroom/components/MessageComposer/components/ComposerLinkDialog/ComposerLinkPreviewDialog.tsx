import { Icons } from '@components/icons/registry'
import { InternalLinkChip } from '@components/TipTap/hyperlinkPopovers/components/InternalLinkChip'
import { classifyInternalDocumentLink } from '@components/TipTap/hyperlinkPopovers/internalDocumentLink'
import { runInternalDocumentLink } from '@components/TipTap/hyperlinkPopovers/internalDocumentLinkActions'
import useCopyToClipboard from '@hooks/useCopyToClipboard'
import { useStore } from '@stores'
import { useId, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { ComposerLinkModalShell } from './ComposerLinkModalShell'

type Props = {
  href: string
  onEdit: () => void
  onRemove: () => void
  onClose: () => void
}

export function ComposerLinkPreviewDialog({ href, onEdit, onRemove, onClose }: Props) {
  const titleId = useId()
  const padEditor = useStore((s) => s.settings.editor.instance)
  const internalLink = useMemo(
    () => classifyInternalDocumentLink(href, window.location.pathname),
    [href]
  )

  const { copy, copied } = useCopyToClipboard({
    successMessage: null,
    errorMessage: 'Failed to copy link'
  })

  const handleGo = () => {
    if (!internalLink) return
    onClose()
    runInternalDocumentLink(internalLink)
  }

  return (
    <ComposerLinkModalShell titleId={titleId} onBackdropClick={onClose}>
      <div data-testid="composer-link-preview">
        <h2 id={titleId} className="sr-only">
          Link options
        </h2>
        {internalLink ? (
          <InternalLinkChip link={internalLink} editor={padEditor ?? null} />
        ) : (
          <p className="truncate text-sm" title={href}>
            {href}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-1">
          {internalLink && (
            <button
              type="button"
              className="btn btn-primary justify-start"
              onClick={handleGo}
              data-testid="composer-link-preview-go">
              <Icons.chevronRight size={18} aria-hidden />
              Go to destination
            </button>
          )}
          <button
            type="button"
            className={twMerge('btn btn-ghost justify-start', copied && 'text-success')}
            onClick={() => void copy(href)}
            aria-label={copied ? 'Copied!' : 'Copy link'}
            data-testid="composer-link-preview-copy">
            <span className={twMerge('swap', copied && 'swap-active')} aria-hidden>
              <span className="swap-on">Copied!</span>
              <span className="swap-off">Copy link</span>
            </span>
          </button>
          <button
            type="button"
            className="btn btn-ghost text-error justify-start"
            onClick={onRemove}
            data-testid="composer-link-preview-remove">
            Remove link
          </button>
          <button
            type="button"
            className="btn btn-ghost justify-start"
            onClick={onEdit}
            data-testid="composer-link-preview-edit">
            Edit
          </button>
        </div>
      </div>
    </ComposerLinkModalShell>
  )
}
