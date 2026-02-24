"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { createRoot } from "react-dom/client";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case "success": return <CheckCircle2 size={18} color="#10b981" />;
            case "error": return <AlertCircle size={18} color="#ef4444" />;
            default: return <Info size={18} color="#3b82f6" />;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            zIndex: 9999,
            minWidth: '300px',
            maxWidth: '400px',
        }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {getIcon()}
            </div>
            <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
                {message}
            </div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}

// Imperative API for easy calling anywhere
let toastContainer: HTMLDivElement | null = null;
let root: any = null;

export const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    if (typeof document === 'undefined') return;

    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
        root = createRoot(toastContainer);
    }

    const handleClose = () => {
        if (root) {
            root.unmount();
            if (toastContainer && toastContainer.parentNode) {
                toastContainer.parentNode.removeChild(toastContainer);
            }
            toastContainer = null;
            root = null;
        }
    };

    root.render(<Toast message={message} type={type} duration={duration} onClose={handleClose} />);
};
