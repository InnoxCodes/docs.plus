import SharedButton, { type ButtonShape, type ButtonVariant } from '@components/ui/Button'
import { Placement } from '@floating-ui/react'
import { useTouchPress } from '@hooks/useTouchPress'
import React from 'react'
import { twMerge } from 'tailwind-merge'

interface ToolbarButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  onPress?: (event: React.MouseEvent | React.TouchEvent) => void
  tooltip?: string
  tooltipPosition?: Placement
  isActive?: boolean
  variant?: ButtonVariant
  shape?: ButtonShape
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      onPress,
      children,
      tooltip,
      tooltipPosition = 'bottom',
      className,
      isActive,
      variant = 'ghost',
      shape,
      onPointerDown,
      onClick,
      ...rest
    },
    ref
  ) => {
    // Click is wired unconditionally below, unlike the pad button, which gates on `onPress`.
    // The hook's `preventDefault` on every click keeps the composer editor selection from being stolen.
    const { handleTouchEnd, handleClick } = useTouchPress(onPress, onClick)

    return (
      <SharedButton
        ref={ref}
        variant={variant}
        size="sm"
        shape={shape}
        className={twMerge(
          'min-h-0 cursor-pointer touch-manipulation border-0 p-0 antialiased',
          isActive && 'is-active btn-active',
          className
        )}
        onTouchEnd={onPress ? handleTouchEnd : undefined}
        onClick={handleClick}
        onPointerDown={onPointerDown}
        tooltip={tooltip}
        tooltipPlacement={tooltipPosition}
        {...rest}>
        {children}
      </SharedButton>
    )
  }
)

ToolbarButton.displayName = 'ToolbarButton'

export default ToolbarButton
