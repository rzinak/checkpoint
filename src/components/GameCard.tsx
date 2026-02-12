import type { Game } from '../lib/types';
import { Folder, Calendar, Gamepad2 } from 'lucide-react';
import type { CSSProperties } from 'react';

interface GameCardProps {
  game: Game;
  onClick: () => void;
  style?: CSSProperties;
}

export function GameCard({ game, onClick, style }: GameCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const coverUrl = game.cover_image ? `file://${game.cover_image}` : null;

  return (
    <div className="game-card" onClick={onClick} style={style}>
      <div className="game-card-cover">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={game.name}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="game-card-cover-placeholder">
            <Gamepad2 size={40} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="game-card-info">
        <h3>{game.name}</h3>
        <div className="game-card-path">
          <Folder size={10} />
          {game.save_location}
        </div>
        <div className="game-card-meta">
          <Calendar size={10} />
          Added {formatDate(game.created_at)}
        </div>
      </div>
    </div>
  );
}
