// SongDialog：宋式确认弹窗（替代系统 confirm/alert）
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  resolve: ((ok: boolean) => void) | null;
}

const DialogContext = createContext<{
  confirm: (message: string, opts?: { title?: string; confirmText?: string; danger?: boolean }) => Promise<boolean>;
}>({ confirm: async () => false });

export function useConfirm() {
  return useContext(DialogContext).confirm;
}

export function SongDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, title: '', message: '', confirmText: '确 定', danger: false, resolve: null });

  const confirm = useCallback((message: string, opts?: { title?: string; confirmText?: string; danger?: boolean }) => {
    return new Promise<boolean>(resolve => {
      setState({
        open: true,
        title: opts?.title || '慎问',
        message,
        confirmText: opts?.confirmText || '确 定',
        danger: !!opts?.danger,
        resolve,
      });
    });
  }, []);

  const close = (ok: boolean) => {
    state.resolve?.(ok);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  const dangerStyle: CSSProperties = state.danger ? { borderColor: 'var(--cinnabar)', color: 'var(--cinnabar)' } : {};

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="song-dialog-mask" onClick={() => close(false)}>
          <div className="song-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dlg-title">{state.title}</div>
            <div className="dlg-body">{state.message}</div>
            <div className="dlg-actions">
              <button className="btn-seal btn-ghost" style={{ fontSize: '.85rem', padding: '.42rem 1.2rem' }} onClick={() => close(false)}>再 思</button>
              <button className="btn-seal" style={{ fontSize: '.85rem', padding: '.42rem 1.2rem', ...dangerStyle }} onClick={() => close(true)}>
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}