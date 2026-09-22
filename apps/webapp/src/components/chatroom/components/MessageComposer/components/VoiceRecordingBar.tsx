import { Icons } from '@icons'
import { twMerge } from 'tailwind-merge'

import { useMessageComposer } from '../hooks/useMessageComposer'
import type { UseVoiceRecorderReturn } from '../hooks/useVoiceRecorder'

type Props = Pick<
  UseVoiceRecorderReturn,
  | 'phase'
  | 'elapsedLabel'
  | 'waveformLevels'
  | 'isCancelArmed'
  | 'isLocked'
  | 'previewUrl'
  | 'cancelRecording'
  | 'stopRecording'
  | 'confirmAttach'
  | 'discardPreview'
>

export function VoiceRecordingBar({
  phase,
  elapsedLabel,
  waveformLevels,
  isCancelArmed,
  isLocked,
  previewUrl,
  cancelRecording,
  stopRecording,
  confirmAttach,
  discardPreview
}: Props) {
  const { isMobile } = useMessageComposer()
  if (phase !== 'recording' && phase !== 'preview') return null

  const barClassName = 'border-base-300/60 bg-base-200 flex items-center gap-2 border-b px-3 py-2'
  // btn-xs keeps the label small; the phone touch target grows to 44 px.
  const touchClassName = isMobile && 'min-h-11 min-w-11'

  if (phase === 'preview') {
    return (
      <div
        className={barClassName}
        data-testid="composer-recording-bar"
        role="region"
        aria-label="Voice note preview">
        <span className="text-base-content/60 text-xs font-medium tabular-nums">
          {elapsedLabel}
        </span>
        {previewUrl ? (
          <audio
            className="min-w-0 flex-1"
            controls
            src={previewUrl}
            aria-label="Voice note preview"
          />
        ) : null}
        <button
          type="button"
          className={twMerge('btn btn-ghost btn-xs shrink-0', touchClassName)}
          onClick={discardPreview}>
          Discard
        </button>
        <button
          type="button"
          className={twMerge('btn btn-primary btn-xs shrink-0', touchClassName)}
          data-testid="composer-recording-attach"
          onClick={confirmAttach}>
          Attach
        </button>
      </div>
    )
  }

  return (
    <div
      className={twMerge(barClassName, isCancelArmed && 'bg-error/10', isLocked && 'bg-primary/5')}
      data-testid="composer-recording-bar"
      role="region"
      aria-label={isLocked ? 'Recording locked' : 'Recording voice note'}>
      {isLocked ? (
        <Icons.lock size={14} className="text-primary shrink-0 stroke-[1.75]" aria-hidden />
      ) : (
        <span className="bg-error size-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none" />
      )}
      <span className="text-xs font-semibold tabular-nums">{elapsedLabel}</span>
      <div className="flex min-w-0 flex-1 items-center gap-0.5" aria-hidden>
        {waveformLevels.map((level, index) => (
          <span
            key={index}
            className="bg-primary inline-block w-0.5 rounded-full motion-safe:transition-[height]"
            style={{ height: `${Math.round(level * 16)}px` }}
          />
        ))}
      </div>
      {/* Only the lock state is live. The elapsed time stays outside, so it is not read each second. */}
      <span role="status">
        {!isLocked ? (
          <span className="text-base-content/50 text-[10px] leading-tight">
            <span className="block">slide up to lock</span>
            <span className="block">slide left to cancel</span>
          </span>
        ) : (
          <span className="text-base-content/60 text-[10px]">Recording locked</span>
        )}
      </span>
      {isLocked ? (
        <button
          type="button"
          className={twMerge('btn btn-error btn-xs shrink-0', touchClassName)}
          data-testid="composer-recording-stop"
          onClick={stopRecording}>
          Stop
        </button>
      ) : (
        <button
          type="button"
          className={twMerge('btn btn-ghost btn-xs shrink-0', touchClassName)}
          onClick={cancelRecording}>
          Cancel
        </button>
      )}
    </div>
  )
}
