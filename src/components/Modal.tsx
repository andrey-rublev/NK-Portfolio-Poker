import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

interface ModalProps {
  /** id of the element that names the dialog. */
  labelledBy: string
  className?: string
  /** Element to focus when the dialog opens (defaults to the browser's choice). */
  initialFocus?: RefObject<HTMLElement | null>
  /** Esc, a click on the backdrop, or the browser closing the dialog. */
  onClose: () => void
  children: ReactNode
}

/**
 * A native modal <dialog>, open for as long as it is mounted. showModal() puts
 * it in the browser's top layer -- above everything, including the 3D scene's
 * HTML overlays -- and makes the rest of the page inert, so focus can't wander
 * behind it. Focus returns to whatever opened it when it closes.
 */
export function Modal({ labelledBy, className, initialFocus, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const pressedBackdrop = useRef(false)

  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    initialFocus?.current?.focus()

    // Esc fires `cancel`; the parent decides what closing means by unmounting.
    const onCancel = (e: Event) => {
      e.preventDefault()
      onCloseRef.current()
    }
    // Browsers may close the dialog without a cancelable `cancel` (repeated
    // Esc presses), so keep the parent in step whenever it actually closes.
    // `close` is dispatched asynchronously, so one from an earlier close (a
    // StrictMode remount) can arrive after the dialog has reopened -- ignore it.
    const onNativeClose = () => {
      if (!dialog.open) onCloseRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onNativeClose)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onNativeClose)
      if (dialog.open) dialog.close()
      if (opener?.isConnected) opener.focus()
    }
    // Opening is a mount-time effect; `initialFocus` is a stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      // Clicks on the backdrop land on the <dialog> itself. Require the press to
      // start there too, so a text selection dragged out of the panel doesn't
      // close it.
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
