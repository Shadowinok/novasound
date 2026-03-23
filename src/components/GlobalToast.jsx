import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';

export default function GlobalToast() {
  const { toast, hideToast } = useToast();

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => hideToast(), toast.ttl);
    return () => clearTimeout(id);
  }, [toast, hideToast]);

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`global-toast type-${toast.type}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            onClick={hideToast}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .global-toast {
          position: fixed;
          right: 14px;
          bottom: calc(var(--footer-dock-height, 0px) + 86px);
          z-index: 120;
          max-width: min(88vw, 360px);
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(5, 217, 232, 0.45);
          background: rgba(10, 18, 28, 0.97);
          color: #dffbff;
          font-size: 0.9rem;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          backdrop-filter: blur(2px);
        }
        .global-toast.type-success {
          border-color: rgba(61, 214, 140, 0.7);
          color: #d6ffe8;
        }
        .global-toast.type-error {
          border-color: rgba(255, 77, 109, 0.7);
          color: #ffdce3;
        }
      `}</style>
    </>
  );
}
