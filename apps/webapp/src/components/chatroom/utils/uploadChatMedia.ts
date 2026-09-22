import { removeFileFromStorage, uploadFileToStorageWithProgress } from '@api'
import type { MessageMediaItem } from '@types'

import { isVoiceNoteName, readAudioShape } from './chatAudio'
import { chatMediaStorageExtension, resolveChatMediaMime } from './chatMediaMime'
import {
  CHAT_MEDIA_BUCKET,
  CHAT_MEDIA_MAX_BYTES,
  inferMessageMediaKind,
  type MediaPixelSize,
  mediaStoragePath,
  positiveMediaDims
} from './messageMediaPaths'

export const CHAT_MEDIA_TOO_LARGE_ERROR = 'File must be 10 MB or smaller'

export type UploadChatMediaOptions = {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export async function deleteChatMediaFromStorage(item: MessageMediaItem): Promise<void> {
  const storagePath = mediaStoragePath(item)
  if (!storagePath) return

  const { error } = await removeFileFromStorage(CHAT_MEDIA_BUCKET, storagePath)
  if (error) {
    console.warn('[chat-media] failed to delete storage object', storagePath, error)
  }
}

/** Best-effort intrinsic size; never throws — omit dims on any failure. */
async function readUploadMediaDims(
  file: File,
  kind: MessageMediaItem['type']
): Promise<MediaPixelSize | null> {
  try {
    if (kind === 'image') {
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file)
        const dims = positiveMediaDims(bitmap.width, bitmap.height)
        bitmap.close()
        return dims
      }
      return await new Promise<MediaPixelSize | null>((resolve) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
          const dims = positiveMediaDims(img.naturalWidth, img.naturalHeight)
          URL.revokeObjectURL(objectUrl)
          resolve(dims)
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          resolve(null)
        }
        img.src = objectUrl
      })
    }

    if (kind === 'video') {
      return await new Promise<MediaPixelSize | null>((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        const objectUrl = URL.createObjectURL(file)
        const finish = (dims: MediaPixelSize | null) => {
          URL.revokeObjectURL(objectUrl)
          video.removeAttribute('src')
          video.load()
          resolve(dims)
        }
        video.onloadedmetadata = () => {
          finish(positiveMediaDims(video.videoWidth, video.videoHeight))
        }
        video.onerror = () => finish(null)
        video.src = objectUrl
      })
    }
  } catch {
    return null
  }
  return null
}

/** Upload-time metadata: pixel size for images and video, length and peaks for a voice note. */
async function readUploadMediaMeta(
  file: File,
  kind: MessageMediaItem['type']
): Promise<Partial<MessageMediaItem>> {
  if (kind === 'image' || kind === 'video') return (await readUploadMediaDims(file, kind)) ?? {}
  if (kind === 'audio' && isVoiceNoteName(file.name)) return (await readAudioShape(file)) ?? {}
  return {}
}

export async function uploadChatMedia(
  file: File,
  userId: string,
  channelId: string,
  options: UploadChatMediaOptions = {}
): Promise<MessageMediaItem> {
  if (file.size > CHAT_MEDIA_MAX_BYTES) {
    throw new Error(CHAT_MEDIA_TOO_LARGE_ERROR)
  }

  const type = inferMessageMediaKind(file)
  const storagePath = `${userId}/${channelId}/${crypto.randomUUID()}.${chatMediaStorageExtension(file)}`
  const contentType = resolveChatMediaMime(file) || undefined

  const [{ error }, meta] = await Promise.all([
    uploadFileToStorageWithProgress(CHAT_MEDIA_BUCKET, storagePath, file, contentType, options),
    readUploadMediaMeta(file, type)
  ])

  if (error) {
    const message =
      typeof error.message === 'string' && error.message.trim()
        ? error.message
        : 'Failed to upload file'
    console.error('[chat-media] upload failed', {
      channelId,
      path: storagePath,
      name: (error as { name?: string }).name,
      statusCode: (error as { statusCode?: string | number }).statusCode,
      message
    })
    throw new Error(message)
  }

  return {
    path: storagePath,
    url: storagePath,
    type,
    name: file.name,
    size: file.size,
    ...meta
  }
}
