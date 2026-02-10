import { useState, useEffect } from 'react';
import { useProfile } from '../lib/profileContext';
import { getDriveStorageInfo } from '../lib/googleDrive';
import { ArrowLeft, User, Cloud, Database, LogOut, Loader2 } from 'lucide-react';

interface ProfileProps {
  onBack: () => void;
}

export function Profile({ onBack }: ProfileProps) {
  const { profile, isAuthenticated, logout, getValidAccessToken } = useProfile();
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number } | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadStorageInfo();
    }
  }, [isAuthenticated]);

  const loadStorageInfo = async () => {
    setIsLoadingStorage(true);
    try {
      const token = await getValidAccessToken();
      if (token) {
        const info = await getDriveStorageInfo(token);
        setStorageInfo(info);
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleLogout = () => {
    logout();
    onBack();
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <div className="profile-page-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
          <h2>Profile</h2>
        </div>
        <div className="profile-page-content">
          <div className="profile-not-authenticated">
            <div className="profile-icon-large">
              <User size={48} />
            </div>
            <h3>Not Signed In</h3>
            <p>Sign in with Google to enable cloud backup features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <h2>Profile</h2>
      </div>

      <div className="profile-page-content">
        {/* User Info Card */}
        <div className="profile-card-large">
          <div className="profile-avatar-large">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} />
            ) : (
              <User size={32} />
            )}
          </div>
          <div className="profile-details">
            <h3>{profile?.name}</h3>
            <p>{profile?.email}</p>
          </div>
        </div>

        {/* Storage Info Card */}
        <div className="profile-section">
          <div className="profile-section-header">
            <Cloud size={18} />
            <h3>Cloud Storage</h3>
          </div>
          
          {isLoadingStorage ? (
            <div className="profile-loading">
              <Loader2 size={24} className="spinner" />
              <span>Loading storage info...</span>
            </div>
          ) : storageInfo ? (
            <div className="storage-info">
              <div className="storage-bar-container">
                <div 
                  className="storage-bar-used"
                  style={{ width: `${(storageInfo.used / storageInfo.total) * 100}%` }}
                />
              </div>
              <div className="storage-stats">
                <span>{formatBytes(storageInfo.used)} used</span>
                <span>{formatBytes(storageInfo.total)} total</span>
              </div>
            </div>
          ) : (
            <p className="profile-error">Failed to load storage information</p>
          )}
        </div>

        {/* Account Actions */}
        <div className="profile-section">
          <div className="profile-section-header">
            <Database size={18} />
            <h3>Account</h3>
          </div>
          <button className="profile-action-btn profile-action-danger" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
