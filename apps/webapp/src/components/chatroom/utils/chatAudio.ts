import type { MessageMediaItem } from '@types'

import { extensionForMime } from './chatMediaMime'

/** Bars in the feed player; the upload stores exactly one peak per bar. */
export const AUDIO_WAVEFORM_BARS = 40

// The recorder caps a note at 5 minutes, far below this; the cap guards a hand-named upload.
const AUDIO_SHAPE_MAX_BYTES = 5 * 1024 * 1024
// The lowest rate the Web Audio spec guarantees. 40 bars need no more, and the decode stays small.
const AUDIO_SHAPE_SAMPLE_RATE = 8000

// The exact name the recorder writes: `voice-<epoch ms>.<ext>`.
const VOICE_NOTE_NAME = /^voice-\d+\.\w+$/

type AudioShape = Pick<MessageMediaItem, 'duration' | 'waveform'>

/** Names a note by its real type, so iOS mp4 audio is not stored as `.webm`. */
export const voiceNoteFileName = (mime: string): string =>
  `voice-${Date.now()}.${extensionForMime(mime)}`

export const isVoiceNoteName = (name: string | undefined): boolean =>
  VOICE_NOTE_NAME.test(name ?? '')

/** Best-effort length and peaks of a voice note; never throws. Only the sender decodes, once. */
export async function readAudioShape(file: File): Promise<AudioShape | null> {
  if (file.size > AUDIO_SHAPE_MAX_BYTES) return null
  try {
    const context = new OfflineAudioContext(1, 1, AUDIO_SHAPE_SAMPLE_RATE)
    const buffer = await context.decodeAudioData(await file.arrayBuffer())
    if (!(buffer.duration > 0)) return null

    // A voice note is mono, so channel 0 is the note. Levels scale to the loudest bar.
    const samples = buffer.getChannelData(0)
    const size = Math.ceil(samples.length / AUDIO_WAVEFORM_BARS)
    const peaks = Array.from({ length: AUDIO_WAVEFORM_BARS }, (_, bar) => {
      let peak = 0
      for (let i = bar * size; i < Math.min(samples.length, (bar + 1) * size); i++) {
        peak = Math.max(peak, Math.abs(samples[i]))
      }
      return peak
    })
    const loudest = Math.max(...peaks)

    return {
      duration: Math.round(buffer.duration * 10) / 10,
      ...(loudest > 0 ? { waveform: peaks.map((peak) => Math.round((peak / loudest) * 100)) } : {})
    }
  } catch {
    return null
  }
}

const isWaveform = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === AUDIO_WAVEFORM_BARS &&
  value.every((level) => typeof level === 'number' && Number.isFinite(level))

/** Keeps only valid audio fields; both the insert and another client's row pass through here. */
export const parseAudioShape = ({
  duration,
  waveform
}: {
  duration?: unknown
  waveform?: unknown
}): AudioShape => ({
  ...(typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? { duration }
    : {}),
  ...(isWaveform(waveform)
    ? { waveform: waveform.map((level) => Math.min(100, Math.max(0, Math.round(level)))) }
    : {})
})

/** `m:ss` for recording and playback. */
export const formatAudioClock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
