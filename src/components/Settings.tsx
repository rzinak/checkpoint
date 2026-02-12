import { useState } from 'react';
import { setBackupLocation, selectFolder } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Config } from '../lib/types';
import { ArrowLeft, FolderOpen, Sun, Moon, Globe } from 'lucide-react';
import { Select, Input, Button } from './ui';

interface SettingsProps {
  config: Config;
  onBack: () => void;
  onConfigUpdate: (config: Config) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function Settings({ config, onBack, onConfigUpdate, theme, onThemeChange }: SettingsProps) {
  const { t, language, setLanguage } = useI18n();
  const [backupPath, setBackupPath] = useState(config.backup_location);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBrowse = async () => {
    try {
      const folder = await selectFolder();
      if (folder) {
        setBackupPath(folder);
        setSuccess(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedSelectFolder'));
    }
  };

  const handleSave = async () => {
    if (!backupPath.trim()) {
      setError(t('errors.backupLocationEmpty'));
      return;
    }

    if (backupPath.trim().length > 500) {
      setError('Backup location path must be less than 500 characters');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await setBackupLocation(backupPath.trim());
      onConfigUpdate({ ...config, backup_location: backupPath.trim() });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedSaveSettings'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Português' },
    { code: 'es', name: 'Español' }
  ] as const;

  return (
    <div className="settings">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        {t('gameDetail.back')}
      </button>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 700 }}>{t('settings.title')}</h2>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {t('success.settingsSaved')}
        </div>
      )}

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
        <h3>{t('settings.backupLocation')}</h3>
        <div className="form-group">
          <Input
            label={t('settings.backupFolder')}
            id="backupLocation"
            type="text"
            value={backupPath}
            onChange={(e) => {
              setBackupPath(e.target.value);
              setSuccess(false);
            }}
            placeholder="/path/to/backup/folder"
            hint={t('settings.backupHint')}
            maxLength={500}
          />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FolderOpen size={16} />}
            onClick={handleBrowse}
            style={{ marginTop: '0.5rem' }}
          >
            {t('addGame.browse')}
          </Button>
          <p className="settings-local-hint">
            {t('validation.localBackupOnly')}
          </p>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <Button
            variant="primary"
            size="md"
            isLoading={isSaving}
            onClick={handleSave}
          >
            {t('settings.save')}
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('settings.about')}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {t('settings.version')}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {t('settings.description')}
        </p>
      </div>
    </div>
  );
}
