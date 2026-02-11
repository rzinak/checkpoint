import { useProfile } from '../lib/profileContext';
import { initiateGoogleAuth, setOAuthPort } from '../lib/googleDrive';
import { startOAuthServer, waitForOAuthCode, stopOAuthServer } from '../lib/api';
import { User, LogOut, LogIn, Loader2 } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';

interface ProfileCardProps {
  onOpenProfile: () => void;
}

export function ProfileCard({ onOpenProfile }: ProfileCardProps) {
  const { profile, isAuthenticated, logout, isLoading, loginWithGoogle } = useProfile();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    
    try {
      // Step 1: Start the OAuth server and get the port
      console.log('Starting OAuth server...');
      const port = await startOAuthServer();
      console.log('OAuth server started on port:', port);
      
      // Update the redirect URI with the actual port
      setOAuthPort(port);
      
      // Step 2: Get the auth URL and open browser
      const authUrl = await initiateGoogleAuth();
      console.log('Opening browser...');
      await openUrl(authUrl);
      
      // Step 3: Wait for the OAuth code from the server
      console.log('Waiting for OAuth code...');
      const code = await waitForOAuthCode();
      
      if (code) {
        console.log('Got code, exchanging for tokens...');
        await loginWithGoogle(code);
      } else {
        console.log('No code received, login cancelled or timed out');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      // Stop the server if there's an error
      await stopOAuthServer().catch(() => {});
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
        <div className="profile-avatar profile-avatar-placeholder">
          <User size={20} />
        </div>
        <div className="profile-info">
          <span className="profile-name">Not logged in</span>
        </div>
        <button
          className="profile-login-btn"
          onClick={handleLogin}
          disabled={isLoggingIn}
          title="Sign in with Google"
        >
          {isLoggingIn ? (
            <Loader2 size={18} className="spinner" />
          ) : (
            <LogIn size={18} />
          )}
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
