import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', ttl = 2200) => {
    if (!message) return;
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToast({ id, message: String(message), type, ttl: Math.max(800, Number(ttl) || 2200) });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ toast, showToast, hideToast }), [toast, showToast, hideToast]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
