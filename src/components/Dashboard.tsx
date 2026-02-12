import { GameCard } from './GameCard';
import { useI18n } from '../lib/i18n';
import type { Game } from '../lib/types';
import { RefreshCw, Gamepad2, Plus } from 'lucide-react';

interface DashboardProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
  onRefresh: () => void;
  onAddGame: () => void;
}

export function Dashboard({ games, onGameSelect, onRefresh, onAddGame }: DashboardProps) {
  const { t } = useI18n();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{t('dashboard.title')}</h2>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          title={t('dashboard.refresh')}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {games.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Gamepad2 size={48} strokeWidth={1.5} />
          </div>
          <h3>{t('dashboard.emptyState.title')}</h3>
          <p>{t('dashboard.emptyState.description')}</p>
          <button className="empty-state-btn" onClick={onAddGame}>
            <Plus size={20} />
            {t('dashboard.emptyState.button')}
          </button>
        </div>
      ) : (
        <div className="games-grid">
          {[...games].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => onGameSelect(game)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
