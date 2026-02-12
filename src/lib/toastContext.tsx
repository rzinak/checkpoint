import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface Notification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  notifications: Notification[];
  addNotification: (title: string, message: string, type: ToastType) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isLoading: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'checkpoint-notifications';
const MAX_NOTIFICATIONS = 50;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications, isLoading]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addNotification = useCallback((title: string, message: string, type: ToastType = 'info') => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        isLoading
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
