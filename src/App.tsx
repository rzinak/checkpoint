import { useState, useEffect } from 'react';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { Dashboard } from './components/Dashboard';
import { GameDetail } from './components/GameDetail';
import { AddGameModal } from './components/AddGameModal';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { Notifications } from './components/Notifications';
import { ProfileCard } from './components/ProfileCard';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ToastContainer } from './components/Toast';
import { I18nProvider, useI18n } from './lib/i18n';
import { ProfileProvider, useProfile } from './lib/profileContext';
import { ToastProvider, useToast } from './lib/toastContext';
import { listGames } from './lib/api';
import type { Game } from './lib/types';
import { Home, Settings as SettingsIcon, Plus, Bell } from 'lucide-react';

function AddGameFAB({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      className="fab-add-game"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Plus size={24} />
    </button>
  );
}
import './App.css';

type View = 'dashboard' | 'game' | 'settings' | 'profile' | 'notifications';
type Theme = 'light' | 'dark';

function NotificationsBell({ onClick, isActive }: { onClick: () => void; isActive?: boolean }) {
  const { t } = useI18n();
  const { notifications, markAsRead } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <button
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={() => {
        notifications.filter(n => !n.read).forEach(n => markAsRead(n.id));
        onClick();
      }}
      title={t('notifications.title')}
      style={{ position: 'relative' }}
    >
      <Bell size={20} />
      <span>{t('notifications.title')}</span>
      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

function AppContent() {
  const { t } = useI18n();
  const { loginWithGoogle } = useProfile();
  const [view, setView] = useState<View>('dashboard');
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('checkpoint-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('checkpoint-theme', theme);
  }, [theme]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage(t('loading.loading') as string);
      setError(null);
      const gamesData = await listGames();
      setGames(gamesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('errors.failedLoadData') as string));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleDeepLink = async (urls: string[] | null) => {
      if (!urls || urls.length === 0) return;

      try {
        const url = new URL(urls[0]);

        if (url.protocol === 'checkpoint:' && url.host === 'auth') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            setError('Google sign-in failed: ' + error);
            return;
          }

          if (code) {
            try {
              setIsLoading(true);
              setLoadingMessage('Signing in with Google...');
              await loginWithGoogle(code);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
            } finally {
              setIsLoading(false);
              setLoadingMessage('');
            }
          }
        }
      } catch (err) {
        console.error('Failed to handle deep link:', err);
      }
    };

    const unlistenPromise = onOpenUrl(handleDeepLink);

    getCurrent().then(handleDeepLink).catch(err => {
      console.error('Failed to get initial deep link:', err);
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [loginWithGoogle]);

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setView('game');
  };

  const handleBackToDashboard = () => {
    setSelectedGame(null);
    setView('dashboard');
  };

  const handleGameAdded = (newGame: Game) => {
    setGames([...games, newGame]);
    setIsAddModalOpen(false);
  };

  const handleGameDeleted = (game_id: string) => {
    setGames(games.filter(g => g.id !== game_id));
    if (selectedGame?.id === game_id) {
      setSelectedGame(null);
      setView('dashboard');
    }
  };

  const handleGameUpdated = (updatedGame: Game) => {
    setGames(games.map(g => g.id === updatedGame.id ? updatedGame : g));
    if (selectedGame?.id === updatedGame.id) {
      setSelectedGame(updatedGame);
    }
  };

  const setLoadingWithMessage = (loading: boolean, message: string = '') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  if (isLoading && !games.length) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>{t('loading.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <LoadingOverlay isLoading={isLoading && !!loadingMessage} message={loadingMessage} />

      <aside className="sidebar">
        {/* LOGO HERE - gotta replace with actual logo image */}
        <div className="sidebar-logo">
          <div className="logo-placeholder">
            {/* LOGO HERE */}
            <div className="logo-icon">C</div>
          </div>
          <span className="logo-text">{t('app.name')}</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
            title={t('nav.home') as string}
          >
            <Home size={20} />
            <span>{t('nav.home')}</span>
          </button>

          <NotificationsBell
            onClick={() => setView('notifications')}
            isActive={view === 'notifications'}
          />
        </nav>

        <div className="sidebar-bottom-nav">
          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
            title={t('nav.settings') as string}
          >
            <SettingsIcon size={20} />
            <span>{t('nav.settings')}</span>
          </button>

          <ProfileCard onOpenProfile={() => setView('profile')} />
        </div>
      </aside>

      <main className="main-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="content-wrapper">
          {view === 'dashboard' && (
            <Dashboard
              games={games}
              onGameSelect={handleGameSelect}
              onRefresh={loadData}
              onAddGame={() => setIsAddModalOpen(true)}
            />
          )}

          {view === 'game' && selectedGame && (
            <GameDetail
              game={selectedGame}
              onBack={handleBackToDashboard}
              onGameDeleted={handleGameDeleted}
              onGameUpdated={handleGameUpdated}
              setLoading={setLoadingWithMessage}
            />
          )}

          {view === 'settings' && (
            <Settings
              onBack={() => setView('dashboard')}
              theme={theme}
              onThemeChange={setTheme}
              onResetComplete={() => {
                window.location.reload();
              }}
            />
          )}

          {view === 'profile' && (
            <Profile onBack={() => setView('dashboard')} />
          )}

          {view === 'notifications' && (
            <Notifications onBack={() => setView('dashboard')} />
          )}
        </div>

        {view === 'dashboard' && <AddGameFAB onClick={() => setIsAddModalOpen(true)} title={t('nav.addGame')} />}
      </main>

      {isAddModalOpen && (
        <AddGameModal
          onClose={() => setIsAddModalOpen(false)}
          onGameAdded={handleGameAdded}
          setLoading={setLoadingWithMessage}
        />
      )}

      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ProfileProvider>
    </I18nProvider>
  );
}

export default App;
