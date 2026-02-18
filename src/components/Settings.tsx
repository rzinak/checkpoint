import { useState } from 'react';
import { resetCheckpoint } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toastContext';
import { ArrowLeft, Sun, Moon, Globe, ExternalLink, Bug, Trash2 } from 'lucide-react';
import { Select, Button } from './ui';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ConfirmModal } from './ConfirmModal';

interface SettingsProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onResetComplete?: () => void;
}

export function Settings({ onBack, theme, onThemeChange, onResetComplete }: SettingsProps) {
  const { t, language, setLanguage } = useI18n();
  const { addToast, addNotification } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetCheckpoint();
      addToast(t('settings.resetSuccess'), 'success');
      setShowResetConfirm(false);
      if (onResetComplete) {
        onResetComplete();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('settings.resetFailed');
      addToast(errorMsg, 'error');
      addNotification(
        t('settings.resetFailed'),
        errorMsg,
        'error'
      );
    } finally {
      setIsResetting(false);
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Português' },
    { code: 'es', name: 'Español' }
  ] as const;

  const getDefaultBackupLocation = () => {
    if (navigator.userAgent.toLowerCase().includes('windows')) {
      return '%USERPROFILE%\\checkpoint\\';
    }
    return '~/checkpoint/';
  };

  return (
    <div className="settings">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        {t('gameDetail.back')}
      </button>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 700 }}>{t('settings.title')}</h2>

      <div className="settings-section">
        <h3>{t('settings.appearance')}</h3>
        <div className="theme-toggle">
          <button
            className="toggle-switch"
            data-active={theme === 'dark'}
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t('settings.darkMode') : t('settings.lightMode')}
          />
          <span className="theme-toggle-label">
            {theme === 'light' ? (
              <>
                <Sun size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {t('settings.lightMode')}
              </>
            ) : (
              <>
                <Moon size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {t('settings.darkMode')}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('settings.language')}</h3>
        <div className="language-selector">
          <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'pt' | 'es')}
            options={languages.map(lang => ({ value: lang.code, label: lang.name }))}
            className="language-select"
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('settings.snapshotsLocation')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {t('settings.snapshotsLocationDesc')}
        </p>
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '0.75rem', 
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          wordBreak: 'break-all'
        }}>
          {getDefaultBackupLocation()}
        </div>
        <p className="settings-local-hint" style={{ marginTop: '0.5rem' }}>
          {t('settings.snapshotsLocationHint')}
        </p>
      </div>

      <div className="settings-section">
        <h3>{t('settings.dangerZone')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {t('settings.dangerZoneDesc')}
        </p>
        <Button
          variant="danger"
          size="md"
          leftIcon={<Trash2 size={16} />}
          onClick={() => setShowResetConfirm(true)}
          disabled={isResetting}
        >
          {t('settings.resetData')}
        </Button>
      </div>

      <div className="settings-section">
        <h3>{t('settings.about')}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {t('settings.version')}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {t('settings.description')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            className="external-link"
            onClick={() => openUrl('https://checkpoint-save.vercel.app/')}
          >
            <ExternalLink size={14} />
            {t('settings.website')}
          </button>
          <button
            className="external-link"
            onClick={() => openUrl('https://checkpoint-save.vercel.app/documentation/index.html')}
          >
            <ExternalLink size={14} />
            {t('settings.documentation')}
          </button>
        </div>
        <button
          className="external-link"
          onClick={() => openUrl('https://github.com/rzinak/checkpoint/issues')}
          style={{ color: 'var(--accent)' }}
        >
          <Bug size={14} />
          {t('settings.reportBug')}
        </button>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title={t('settings.resetConfirmTitle')}
        message={t('settings.resetConfirmMessage')}
        confirmText={t('settings.resetConfirm')}
        cancelText={t('addGame.cancel')}
        danger={true}
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
