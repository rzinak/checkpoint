import { GameCard } from './GameCard';
import { useI18n } from '../lib/i18n';
import type { Game } from '../lib/types';
import { RefreshCw, Gamepad2, Plus, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

interface DashboardProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
  onRefresh: () => void;
  onAddGame: () => void;
}

type SortOption = 'dateDesc' | 'dateAsc' | 'nameAsc' | 'nameDesc';

export function Dashboard({ games, onGameSelect, onRefresh, onAddGame }: DashboardProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('dateDesc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(game => game.name.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'dateDesc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'dateAsc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [games, debouncedSearch, sortOption]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{t('dashboard.title')}</h2>
        <div className="dashboard-controls">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.search.placeholder')}
              className="search-input"
            />
          </div>
          <div className="sort-dropdown">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="dateDesc">{t('dashboard.sort.dateDesc')}</option>
              <option value="dateAsc">{t('dashboard.sort.dateAsc')}</option>
              <option value="nameAsc">{t('dashboard.sort.nameAsc')}</option>
              <option value="nameDesc">{t('dashboard.sort.nameDesc')}</option>
            </select>
            <ChevronDown size={16} className="sort-icon" />
          </div>
          <button
            className="refresh-btn"
            onClick={onRefresh}
            title={t('dashboard.refresh')}
          >
            <RefreshCw size={18} />
          </button>
        </div>
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
      ) : filteredAndSortedGames.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={48} strokeWidth={1.5} />
          </div>
          <h3>{t('dashboard.noResults')}</h3>
          <p>{t('dashboard.noResultsDesc')}</p>
        </div>
      ) : (
        <div className="games-grid">
          {filteredAndSortedGames.map((game) => (
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
