import {
  Popover,
  PopoverClose,
  PopoverContent,
  popoverPanelClassName,
  PopoverTrigger
} from '@components/ui/Popover'
import { Icons } from '@icons'
import { twMerge } from 'tailwind-merge'

import { useComposerAttachInput } from '../../../hooks/useComposerAttachInput'
import { useMessageComposer } from '../../../hooks/useMessageComposer'
import Button from '../../ui/Button'

type Props = {
  showVoiceEntry?: boolean
  onVoiceFromMenu?: () => void
  className?: string
}

type InsertMenuRowsProps = {
  atLimit: boolean
  showFormattingToolbar: boolean
  showVoiceEntry?: boolean
  onAttach: () => void
  onFormat: () => void
  onVoice: () => void
  rowClassName: string
}

function InsertMenuRows({
  atLimit,
  showFormattingToolbar,
  showVoiceEntry,
  onAttach,
  onFormat,
  onVoice,
  rowClassName
}: InsertMenuRowsProps) {
  const formatLabel = showFormattingToolbar ? 'Hide formatting' : 'Text formatting'

  return (
    <>
      <PopoverClose className={rowClassName} disabled={atLimit} onClick={onAttach}>
        <Icons.upload size={18} className="text-base-content/80 shrink-0 stroke-[1.75]" />
        Attach file
      </PopoverClose>
      <PopoverClose
        className={twMerge(rowClassName, showFormattingToolbar && 'text-primary')}
        onClick={onFormat}>
        <Icons.textFormat
          size={18}
          className={twMerge(
            'shrink-0 stroke-[1.75]',
            showFormattingToolbar ? 'text-primary' : 'text-base-content/80'
          )}
        />
        {formatLabel}
      </PopoverClose>
      {showVoiceEntry ? (
        <PopoverClose className={rowClassName} onClick={onVoice}>
          <Icons.mic size={18} className="text-base-content/80 shrink-0 stroke-[1.75]" />
          Record voice
        </PopoverClose>
      ) : null}
    </>
  )
}

function ComposerAttachInput({
  inputRef,
  accept,
  onInputChange
}: Pick<ReturnType<typeof useComposerAttachInput>, 'inputRef' | 'accept' | 'onInputChange'>) {
  return (
    <input
      ref={inputRef}
      type="file"
      {...(accept ? { accept } : {})}
      multiple
      className="sr-only"
      tabIndex={-1}
      data-testid="composer-attach-input"
      aria-hidden
      onChange={onInputChange}
    />
  )
}

/** Left-edge + menu: attach, text formatting, optional voice — opens on click/tap only. */
export function ComposerInsertMenu({ showVoiceEntry, onVoiceFromMenu, className }: Props) {
  const { isMobile, showFormattingToolbar, toggleToolbar } = useMessageComposer()
  const attach = useComposerAttachInput()

  const rowClassName = isMobile
    ? 'hover:bg-base-200 flex w-full min-h-11 items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm disabled:opacity-40'
    : 'hover:bg-base-200 flex w-full items-center gap-2.5 rounded-field px-2.5 py-2 text-left text-sm disabled:opacity-40'

  return (
    <>
      <ComposerAttachInput {...attach} />
      <Popover placement="top-start">
        <PopoverTrigger asChild>
          <Button
            className={twMerge(
              isMobile
                ? 'rounded-field size-11 min-h-11 min-w-11 shrink-0 border-0 p-0'
                : 'rounded-field size-8 min-h-8 min-w-8 shrink-0 border-0 p-0',
              className
            )}
            data-testid="composer-insert-trigger"
            aria-label="Insert — attach, format, and more">
            <Icons.plus
              size={isMobile ? 20 : 18}
              className="pointer-events-none shrink-0 stroke-[1.75]"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={twMerge(popoverPanelClassName, isMobile ? 'w-52 p-1.5' : 'w-48 p-1')}
          aria-label="Insert">
          <InsertMenuRows
            atLimit={attach.atLimit}
            showFormattingToolbar={showFormattingToolbar}
            showVoiceEntry={showVoiceEntry}
            onAttach={attach.openFilePicker}
            onFormat={toggleToolbar}
            onVoice={() => onVoiceFromMenu?.()}
            rowClassName={rowClassName}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
