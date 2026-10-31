"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

const icons = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const validTypes = ["success", "error", "warning", "info"];

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map());

  useEffect(() => {
    setMounted(true);

    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "success", duration = 4000) => {
      if (typeof message !== "string" || !message.trim()) {
        return;
      }

      const safeType = validTypes.includes(type) ? type : "info";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((current) => [
        ...current,
        {
          id,
          message: message.trim(),
          type: safeType,
        },
      ]);

      const timer = setTimeout(
        () => {
          setToasts((current) => current.filter((toast) => toast.id !== id));

          timers.current.delete(id);
        },
        Math.max(1000, duration),
      );

      timers.current.set(id, timer);

      return id;
    },
    [],
  );

  const success = useCallback(
    (message, duration) => showToast(message, "success", duration),
    [showToast],
  );

  const error = useCallback(
    (message, duration) => showToast(message, "error", duration),
    [showToast],
  );

  const warning = useCallback(
    (message, duration) => showToast(message, "warning", duration),
    [showToast],
  );

  const info = useCallback(
    (message, duration) => showToast(message, "info", duration),
    [showToast],
  );

  const contextValue = {
    showToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {mounted &&
        createPortal(
          <div className="toast-container" aria-label="Notifications">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`glass-toast toast-${toast.type}`}
                role={toast.type === "error" ? "alert" : "status"}
                aria-live={toast.type === "error" ? "assertive" : "polite"}
              >
                <span className="toast-icon" aria-hidden="true">
                  {icons[toast.type]}
                </span>

                <span className="toast-message">{toast.message}</span>

                <button
                  type="button"
                  className="toast-close"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
