import { createContext, useContext } from 'react'

export type ComposerAttachmentActions = {
  /** Returns the ids of the files it queued; a refused file gets none. */
  addFiles: (files: FileList | File[]) => string[]
  removeAttachment: (id: string) => void
  retryAttachment: (id: string) => void
  toggleAttachmentSpoiler: (id: string) => void
}

export const ComposerAttachmentActionsContext = createContext<ComposerAttachmentActions | null>(
  null
)

export const useComposerAttachmentActions = (): ComposerAttachmentActions => {
  const context = useContext(ComposerAttachmentActionsContext)
  if (!context) {
    throw new Error(
      'useComposerAttachmentActions must be used within MessageComposer (attachment actions provider)'
    )
  }
  return context
}
