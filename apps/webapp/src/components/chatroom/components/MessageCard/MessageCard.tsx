import { useIsMessageHighlighted } from '@components/chatroom/hooks/useMessageHighlight'
import { TGroupedMsgRow } from '@types'
import { memo } from 'react'

import MessageActions from './components/MessageActions'
import MessageContent from './components/MessageContent'
import { MessageFailedRow } from './components/MessageFailedRow'
import MessageFooter from './components/MessageFooter/MessageFooter'
import MessageHeader from './components/MessageHeader'
import { MessageLongPressMenu } from './components/MessageLongPressMenu'
import { MessageCardProvider } from './MessageCardContext'

type Props = {
  children: React.ReactNode
  index: number
  message: TGroupedMsgRow
  className?: string
  /** 'highlighted' renders inside the long-press portal — interaction handlers are suppressed there. */
  mode?: 'inline' | 'highlighted'
}

// Memoized so realtime UPDATEs flipping list context identity don't
// cascade across every virtualized row. Highlight uses per-id
// useSyncExternalStore so only the flashed card re-renders.
const MessageCardComponent = ({ children, index, message, className, mode = 'inline' }: Props) => {
  const isFlash = useIsMessageHighlighted(message.id)
  return (
    <MessageCardProvider
      message={message}
      index={index}
      className={`${className ?? ''}${isFlash ? 'msg_card--flash' : ''}`}
      mode={mode}>
      {children}
    </MessageCardProvider>
  )
}

export const MessageCard = memo(
  MessageCardComponent,
  (a, b) => a.index === b.index && a.message === b.message && a.mode === b.mode
) as unknown as typeof MessageCardComponent & {
  Actions: typeof MessageActions
  Header: typeof MessageHeader
  Content: typeof MessageContent
  Footer: typeof MessageFooter
  LongPressMenu: typeof MessageLongPressMenu
  FailedRow: typeof MessageFailedRow
}

MessageCard.Actions = MessageActions
MessageCard.Header = MessageHeader
MessageCard.Content = MessageContent
MessageCard.Footer = MessageFooter
MessageCard.LongPressMenu = MessageLongPressMenu
MessageCard.FailedRow = MessageFailedRow
