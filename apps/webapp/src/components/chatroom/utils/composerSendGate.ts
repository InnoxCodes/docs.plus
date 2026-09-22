export type ComposerSendGateInput = {
  text: string
  readyAttachmentCount: number
  isUploading: boolean
  hasUploadErrors: boolean
}

/**
 * Reactive send affordance: text or ready attachments. An edit's saved attachments
 * load as ready, so an edit with neither left offers no send.
 */
export const composerSendGate = ({
  text,
  readyAttachmentCount,
  isUploading,
  hasUploadErrors
}: ComposerSendGateInput): boolean => {
  if (isUploading || hasUploadErrors) return false
  return text.trim().length > 0 || readyAttachmentCount > 0
}
