import { useProfile } from '../lib/profileContext';
import { initiateGoogleAuth } from '../lib/googleDrive';
import { User, LogOut, LogIn } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';

interface ProfileCardProps {
  onOpenProfile: () => void;
}

export function ProfileCard({ onOpenProfile }: ProfileCardProps) {
  const { profile, isAuthenticated, logout, isLoading, loginWithGoogle } = useProfile();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      const authUrl = await initiateGoogleAuth();
      await openUrl(authUrl);
    } catch (error) {
      console.error('Failed to initiate login:', error);
      alert('Google OAuth configuration missing!\n\n1. Go to https://console.cloud.google.com/\n2. Create OAuth credentials (Desktop app)\n3. Download client_secret.json\n4. Put it in the public/ folder\n\nSee client_secret.json.example for the format.');
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      await loginWithGoogle(manualCode.trim());
      setShowManualInput(false);
      setManualCode('');
    } catch (error) {
      console.error('Manual login failed:', error);
      alert('Invalid code. Please make sure you copied it correctly from the browser.');
    } finally {
      setIsSubmitting(false);
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
    if (showManualInput) {
      return (
        <div className="profile-card profile-card-manual">
          <div className="profile-manual-input">
            <input
              type="text"
              placeholder="Paste code here..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              className="manual-code-input"
              disabled={isSubmitting}
            />
            <div className="manual-code-actions">
              <button 
                className="btn btn-secondary btn-small" 
                onClick={() => setShowManualInput(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-small" 
                onClick={handleManualSubmit}
                disabled={isSubmitting || !manualCode.trim()}
              >
                {isSubmitting ? '...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="profile-card profile-card-guest">
        <div className="profile-avatar profile-avatar-placeholder">
          <User size={20} />
        </div>
        <div className="profile-info">
          <span className="profile-name">Not logged in</span>
        </div>
        <button
          className="profile-login-btn"
          onClick={handleLogin}
          title="Sign in with Google"
        >
          <LogIn size={18} />
        </button>
        <button
          className="profile-manual-btn"
          onClick={() => setShowManualInput(true)}
          title="Enter code manually"
        >
          ...
        </button>
      </div>
    );
  }

  return (
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
      <button
        className="profile-logout-btn"
        onClick={logout}
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
