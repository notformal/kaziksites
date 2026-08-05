import { useEffect, useRef } from 'react';

/**
 * Keyboard/screen-reader behaviour expected of a modal dialog:
 * closes on Escape, moves focus into the dialog on open and restores focus to
 * the triggering element on close.
 *
 * The close handler is kept in a ref so an inline arrow prop cannot re-run the
 * effect on every render (which would steal focus back repeatedly).
 *
 * @param {() => void} onClose invoked when the user presses Escape
 * @returns {React.RefObject<HTMLElement>} ref to attach to the dialog container
 */
export function useDialog(onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  return ref;
}
