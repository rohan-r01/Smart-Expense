"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextIdRef.current++;
    setToasts((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      dismissToast(id);
    }, 3200);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone}`} key={toast.id}>
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss notification"
              className="toast-close"
              type="button"
              onClick={() => dismissToast(toast.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
