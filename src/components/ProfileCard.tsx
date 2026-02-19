import { useProfile } from '../lib/profileContext';
import { initiateGoogleAuth, setOAuthPort } from '../lib/googleDrive';
import { startOAuthServer, waitForOAuthCode, stopOAuthServer } from '../lib/api';
import { User, Loader2 } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { useI18n } from '../lib/i18n';

interface ProfileCardProps {
  onOpenProfile: () => void;
}

export function ProfileCard({ onOpenProfile }: ProfileCardProps) {
  const { profile, isAuthenticated, logout, isLoading, loginWithGoogle } = useProfile();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { t } = useI18n();

  const handleLogin = async () => {
    setIsLoggingIn(true);

    try {
      const port = await startOAuthServer();

      setOAuthPort(port);

      const authUrl = await initiateGoogleAuth();
      await openUrl(authUrl);

      const code = await waitForOAuthCode();

      if (code) {
        await loginWithGoogle(code);
      }
    } catch (error) {
      alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      await stopOAuthServer().catch(() => { });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-card profile-card-loading">
        <div className="profile-avatar profile-avatar-placeholder">
          <div className="profile-loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="profile-card profile-card-guest">
        <button
          className="profile-login-compact"
          onClick={handleLogin}
          disabled={isLoggingIn}
          title={t('profile.googleLogin')}
        >
          {isLoggingIn ? (
            <Loader2 size={16} className="spinner" />
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{t('profile.login')}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="profile-card profile-card-authenticated">
        <button className="profile-content" onClick={onOpenProfile}>
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="profile-info">
            <span className="profile-name">{profile?.name}</span>
            <span className="profile-email">{profile?.email}</span>
          </div>
        </button>
      </div>
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title={t('profile.signOut')}
        message={t('profile.confirmSignOut')}
        confirmText={t('profile.signOut')}
        cancelText={t('common.cancel')}
        danger={true}
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
