import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserProfile } from './types';
import { refreshAccessToken, getUserInfo } from './googleDrive';
// initiateGoogleAuth is imported dynamically when needed

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: (code: string) => Promise<void>;
  logout: () => void;
  getValidAccessToken: () => Promise<string | null>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILE_STORAGE_KEY = 'checkpoint-profile';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
      } catch (e) {
        console.error('Failed to parse profile:', e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (profile) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }, [profile]);

  const loginWithGoogle = async (code: string) => {
    setIsLoading(true);
    try {
      const { exchangeCodeForTokens } = await import('./googleDrive');
      const tokens = await exchangeCodeForTokens(code);
      const userInfo = await getUserInfo(tokens.access_token);
      
      const newProfile: UserProfile = {
        mode: 'google',
        name: userInfo.name,
        email: userInfo.email,
        avatar_url: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: Date.now() + (tokens.expires_in * 1000)
      };
      
      setProfile(newProfile);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    if (!profile || profile.mode !== 'google') {
      return null;
    }

    // Check if token is expired or will expire in next 5 minutes
    if (profile.token_expires_at && profile.token_expires_at < Date.now() + (5 * 60 * 1000)) {
      if (profile.refresh_token) {
        try {
          const newTokens = await refreshAccessToken(profile.refresh_token);
          const updatedProfile = {
            ...profile,
            access_token: newTokens.access_token,
            token_expires_at: Date.now() + (newTokens.expires_in * 1000)
          };
          setProfile(updatedProfile);
          return newTokens.access_token;
        } catch (error) {
          console.error('Token refresh failed:', error);
          logout();
          return null;
        }
      } else {
        logout();
        return null;
      }
    }

    return profile.access_token || null;
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates });
    }
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      isLoading,
      isAuthenticated: profile?.mode === 'google',
      loginWithGoogle,
      logout,
      getValidAccessToken,
      updateProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
