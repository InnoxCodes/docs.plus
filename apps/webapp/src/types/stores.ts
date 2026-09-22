import type { TMsgRow } from './api'
import type { CommentAnchorV1 } from './comment'
import type { Profile } from './domain'

export type CommentMessageMemory = {
  anchor: CommentAnchorV1
  channel_id: string
  workspace_id: string | undefined
  user: Profile | null
}

/** Reply/edit composer context — subset of message row fields the UI needs. */
export type ComposerMessageMemory = Pick<
  TMsgRow,
  'id' | 'channel_id' | 'content' | 'html' | 'medias' | 'type' | 'user_details'
>

export type TChannelSettings = {
  name: any
  channelId?: string | null
  channelInfo?: any
  isUserChannelMember?: boolean
  isUserChannelOwner?: boolean
  isUserChannelAdmin?: boolean
  replyMessageMemory?: ComposerMessageMemory | null
  commentMessageMemory?: CommentMessageMemory | null
  editMessageMemory?: ComposerMessageMemory | null
  member_count?: number
}
