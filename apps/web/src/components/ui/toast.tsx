'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastActions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastActions;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Style maps ───────────────────────────────────────────────────────────────

const typeConfig: Record<
  ToastType,
  { icon: React.ReactNode; containerClass: string; iconClass: string }
> = {
  success: {
    icon: <Check className="h-4 w-4" />,
    containerClass: 'border-green-200 bg-green-50',
    iconClass: 'text-green-600 bg-green-100',
  },
  error: {
    icon: <X className="h-4 w-4" />,
    containerClass: 'border-red-200 bg-red-50',
    iconClass: 'text-red-600 bg-red-100',
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    containerClass: 'border-blue-200 bg-blue-50',
    iconClass: 'text-blue-600 bg-blue-100',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    containerClass: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-600 bg-amber-100',
  },
};

const AUTO_DISMISS_MS = 5000;

// ─── Single Toast ─────────────────────────────────────────────────────────────

interface SingleToastProps {
  item: ToastItem;
  onRemove: (id: string) => void;
}

function SingleToast({ item, onRemove }: SingleToastProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = typeConfig[item.type];

  const dismiss = useCallback(() => {
    setVisible(false);
    // Allow fade-out animation to finish before unmounting
    setTimeout(() => onRemove(item.id), 300);
  }, [item.id, onRemove]);

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      cancelAnimationFrame(frame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        'w-80 transition-all duration-300 ease-in-out',
        config.containerClass,
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      {/* Icon */}
      <span
        className={clsx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          config.iconClass,
        )}
      >
        {config.icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-gray-800 pt-0.5">
        {item.message}
      </p>

      {/* Close button */}
      <button
        onClick={dismiss}
        className={clsx(
          'shrink-0 rounded p-0.5 text-gray-400 transition-colors duration-150',
          'hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastActions = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    info: (message) => addToast('info', message),
    warning: (message) => addToast('warning', message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container – fixed bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((item) => (
          <SingleToast key={item.id} item={item} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
