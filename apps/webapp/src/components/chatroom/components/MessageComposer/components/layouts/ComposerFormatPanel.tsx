import useReRenderOnEditorTransaction from '@hooks/useReRenderOnEditorTransaction'
import { twMerge } from 'tailwind-merge'

import { useMessageComposer } from '../../hooks/useMessageComposer'
import { FORMAT_TOOLBAR_FLAT, formatToolbarButtonKey } from '../Toolbar/formatToolbarLayout'

/** Mobile-only compact format grid; desktop uses inline FormattingToolbar. */
export function ComposerFormatPanel() {
  const { showFormattingToolbar, editor } = useMessageComposer()
  useReRenderOnEditorTransaction(showFormattingToolbar ? editor : null)

  if (!showFormattingToolbar) return null

  return (
    <div
      className={twMerge(
        'composer-bar__format-panel grid grid-cols-5 gap-1 px-2 py-2',
        'motion-safe:animate-[doc-content-in_120ms_ease-out_both]'
      )}>
      {FORMAT_TOOLBAR_FLAT.map((Button, index) => (
        <Button
          key={formatToolbarButtonKey(Button, index)}
          size={18}
          className="btn-ghost rounded-field size-11 min-h-11 min-w-11 shrink-0 border-0 p-0"
          tooltipPosition="top"
        />
      ))}
    </div>
  )
}
