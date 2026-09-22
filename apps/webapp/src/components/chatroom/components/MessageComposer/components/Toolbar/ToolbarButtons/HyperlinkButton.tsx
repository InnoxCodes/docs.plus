import { snapshotComposerLinkSelection } from '@components/chatroom/components/MessageComposer/stores/composerLinkSelectionRef'
import { Icons } from '@icons'
import { twMerge } from 'tailwind-merge'

import { useMessageComposer } from '../../../hooks'
import Button from '../../ui/Button'

type Props = {
  className?: string
  size?: number
}

export const HyperlinkButton = ({ className, size = 18, ...props }: Props) => {
  const { editor } = useMessageComposer()
  const active = Boolean(editor?.isActive('hyperlink'))

  return (
    <Button
      onPointerDown={(e) => {
        e.preventDefault()
        if (editor) snapshotComposerLinkSelection(editor)
      }}
      onPress={() => editor?.commands.openCreateHyperlinkPopover()}
      isActive={active}
      aria-label="Hyperlink"
      tooltip="Hyperlink (⌘+K)"
      className={twMerge(
        'btn-ghost rounded-field size-8 min-h-8 min-w-8 shrink-0 border-0 p-0',
        className
      )}
      {...props}>
      <Icons.link size={size} className="pointer-events-none shrink-0 stroke-[1.75]" />
    </Button>
  )
}

HyperlinkButton.displayName = 'HyperlinkButton'
