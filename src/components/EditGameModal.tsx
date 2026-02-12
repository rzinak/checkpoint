import { useState, useRef } from 'react';
import { updateGame, selectFolder } from '../lib/api';
import { useI18n } from '../lib/i18n';
import type { Game } from '../lib/types';
import { X, FolderOpen, ImagePlus, Trash2 } from 'lucide-react';
import { Input, Button } from './ui';

interface EditGameModalProps {
  game: Game;
  onClose: () => void;
  onGameUpdated: (game: Game) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export function EditGameModal({ game, onClose, onGameUpdated, setLoading }: EditGameModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(game.name);
  const [saveLocation, setSaveLocation] = useState(game.save_location);
  const [exeName, setExeName] = useState(game.exe_name || '');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowse = async () => {
    try {
      const folder = await selectFolder();
      if (folder) {
        setSaveLocation(folder);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedSelectFolder'));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG or PNG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCoverImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !saveLocation.trim()) {
      setError(t('errors.requiredFields'));
      return;
    }

    // Validate character limits
    if (name.trim().length > 100) {
      setError('Game name must be less than 100 characters');
      return;
    }
    if (saveLocation.trim().length > 500) {
      setError('Save location path must be less than 500 characters');
      return;
    }
    if (exeName.trim().length > 100) {
      setError('Executable name must be less than 100 characters');
      return;
    }

    setIsLoading(true);
    setLoading(true, t('loading.loading'));
    setError(null);

    try {
      const updatedGame = await updateGame({
        game_id: game.id,
        name: name.trim(),
        save_location: saveLocation.trim(),
        exe_name: exeName.trim() || undefined,
        cover_image: coverImage || undefined,
      });
      setIsLoading(false);
      setLoading(false, '');
      onGameUpdated(updatedGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedAddGame'));
      setIsLoading(false);
      setLoading(false, '');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Game</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div className="cover-upload">
              <label className="cover-upload-label">Cover Image</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png,image/jpeg"
                style={{ display: 'none' }}
              />

              {coverImage ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div className="cover-upload-preview">
                    <img src={coverImage} alt="Cover preview" />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="cover-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="cover-upload-placeholder">
                    <ImagePlus size={32} />
                    <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                      {game.cover_image ? 'Change cover image' : 'Click to upload cover'}
                    </p>
                  </div>
                </div>
              )}
              <p className="cover-upload-hint">JPG or PNG, max 2MB, 3:4 ratio recommended</p>
            </div>

            <Input
              label={t('addGame.name') + ' *'}
              id="gameName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('addGame.namePlaceholder')}
              maxLength={100}
              required
            />

            <Input
              label={t('addGame.saveLocation') + ' *'}
              id="saveLocation"
              type="text"
              value={saveLocation}
              onChange={(e) => setSaveLocation(e.target.value)}
              placeholder={t('addGame.saveLocationPlaceholder')}
              hint={t('addGame.saveLocationHint')}
              maxLength={500}
              required
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderOpen size={16} />}
              onClick={handleBrowse}
              style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}
            >
              {t('addGame.browse')}
            </Button>

            <Input
              label={t('addGame.executable')}
              id="exeName"
              type="text"
              value={exeName}
              onChange={(e) => setExeName(e.target.value)}
              placeholder={t('addGame.executablePlaceholder')}
              hint={t('addGame.executableHint')}
              maxLength={100}
            />
          </div>

          <div className="modal-footer">
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('addGame.cancel')}
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
