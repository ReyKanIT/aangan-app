/**
 * useConfirm — async, Hindi-first confirm() for React Native.
 *
 * Lives next to ConfirmDialog.tsx; this file is the "API" most callers
 * touch. The web counterpart uses a top-level Provider, but in RN we
 * prefer the lighter, screen-local pattern that matches react-hook-form
 * and friends:
 *
 *   const { confirm, dialog } = useConfirm();
 *
 *   // mount the dialog inside the screen's JSX (usually at the very end):
 *   return (
 *     <View>
 *       {... screen content ...}
 *       {dialog}
 *     </View>
 *   );
 *
 *   // then anywhere in handlers:
 *   const ok = await confirm({
 *     title: 'लॉगआउट करें?',
 *     body:  'आप फिर से लॉगिन कर सकते हैं।',
 *     confirmText: 'हाँ, लॉगआउट',
 *     cancelText:  'रद्द करें',
 *     destructive: true,
 *   });
 *   if (!ok) return;
 *
 * Resolves:
 *   • true  — user tapped the confirm button
 *   • false — user tapped cancel, the backdrop, or hardware-back
 *
 * Concurrency: only one confirm dialog can be in flight per hook
 * instance. If `confirm()` is called while another is open, the older
 * promise resolves with `false` (treated as cancel) and the new one
 * takes over. This matches what the user actually sees on screen.
 */
import React, { useCallback, useRef, useState } from 'react';
import { ConfirmDialog, ConfirmOptions } from './ConfirmDialog';

type Resolver = (value: boolean) => void;

export interface UseConfirmReturn {
  /**
   * Open the dialog with the given options and await the user's choice.
   * Returns `true` if confirmed, `false` if cancelled / dismissed.
   */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /**
   * JSX node you MUST render somewhere in your component tree (usually
   * at the very end). Without this, calling `confirm()` will resolve
   * normally but the user will never see the dialog.
   */
  dialog: React.ReactElement;
}

export function useConfirm(): UseConfirmReturn {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  // Called by the dialog when the user picks a button / dismisses.
  const handleResolve = useCallback((result: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setVisible(false);
    // Keep `options` around for a tick so the closing animation has data
    // to render against. Clearing immediately is also fine — the Modal
    // is gated on `visible` first.
    if (resolver) resolver(result);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    // If a previous dialog is still open, resolve it as cancel before
    // we replace it. This keeps any awaiting handler from leaking.
    if (resolverRef.current) {
      const stale = resolverRef.current;
      resolverRef.current = null;
      stale(false);
    }
    setOptions(opts);
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // `dialog` is a ready-to-render element — caller drops it into JSX
  // and forgets about it. We always create the element (even when
  // `visible` is false) so the Modal can mount/unmount cleanly on the
  // RN side.
  const dialog = (
    <ConfirmDialog
      visible={visible}
      options={options}
      onResolve={handleResolve}
    />
  );

  return { confirm, dialog };
}

export default useConfirm;
