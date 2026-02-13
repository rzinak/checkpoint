import { ArrowLeft, Bell, Trash2, Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useToast, type Notification } from '../lib/toastContext';

interface NotificationsProps {
  onBack: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
  const { t, language } = useI18n();
  const { notifications, markAsRead, /* markAllAsRead, */ clearAll, isLoading } = useToast();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Bell size={18} style={{ color: 'var(--success)' }} />;
      case 'error':
        return <Bell size={18} style={{ color: 'var(--error)' }} />;
      case 'warning':
        return <Bell size={18} style={{ color: 'var(--warning)' }} />;
      case 'info':
      default:
        return <Bell size={18} style={{ color: 'var(--accent)' }} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo').replace('{minutes}', minutes.toString());
    if (hours < 24) return t('time.hoursAgo').replace('{hours}', hours.toString());
    if (days < 7) return t('time.daysAgo').replace('{days}', days.toString());
    const locale = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header" style={{ marginBottom: '1.5rem' }}>
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t('gameDetail.back')}
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('notifications.title')}
          </h2>
          {unreadCount > 0 && (
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {unreadCount} {unreadCount === 1 ? t('notifications.unreadSingular') : t('notifications.unreadPlural')}
            </p>
          )}
        </div>
        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            {/*
            <button
              className="btn btn-secondary btn-small"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check size={16} />
              Mark all read
            </button>
            */}
            <button
              className="btn btn-small"
              onClick={clearAll}
              disabled={notifications.length === 0}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none'
              }}
            >
              <Trash2 size={16} />
              {t('notifications.clearAll')}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem' }}>
          <Loader2 size={32} className="spinner" style={{ color: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('notifications.loading')}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--bg-tertiary)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={40} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('notifications.noNotifications')}
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
            {t('notifications.description')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className="notification-item"
              onClick={() => markAsRead(notification.id)}
              style={{
                background: notification.read ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderLeft: notification.read ? '3px solid var(--border)' : `3px solid var(${notification.type === 'error' ? '--error' : notification.type === 'warning' ? '--warning' : notification.type === 'success' ? '--success' : '--accent'})`
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getIcon(notification.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {notification.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {formatTime(notification.timestamp)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {notification.message}
                </p>
              </div>

              {!notification.read && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: '6px'
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
