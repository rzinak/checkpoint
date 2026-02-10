import { useState, useEffect, useCallback } from 'react';
import {
  listSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  renameSnapshot,
  deleteGame,
  isProcessRunning,
  importSnapshot
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useProfile } from '../lib/profileContext';
import { uploadSnapshot, listCloudSnapshots, downloadSnapshot } from '../lib/googleDrive';
import type { Game, Snapshot, CloudSyncState } from '../lib/types';
import { ArrowLeft, Plus, RotateCcw, Trash2, Edit3, CheckCircle, AlertTriangle, Cloud, CloudUpload, CloudDownload, Loader2 } from 'lucide-react';
import { EditGameModal } from './EditGameModal';

interface GameDetailProps {
  game: Game;
  onBack: () => void;
  onGameDeleted: (gameId: string) => void;
  onGameUpdated: (game: Game) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export function GameDetail({ game, onBack, onGameDeleted, onGameUpdated, setLoading }: GameDetailProps) {
  const { t } = useI18n();
  const { isAuthenticated, getValidAccessToken } = useProfile();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [isProcessRunningState, setIsProcessRunningState] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Cloud sync states
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({ sync_status: 'idle' });
  const [backupDestination, setBackupDestination] = useState<'local' | 'cloud' | 'both'>('local');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkProcess = useCallback(async () => {
    if (game.exe_name) {
      try {
        const running = await isProcessRunning(game.exe_name);
        setIsProcessRunningState(running);
      } catch (err) {
        console.error('Failed to check process:', err);
      }
    }
  }, [game.exe_name]);

  const loadSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listSnapshots(game.id);
      setSnapshots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedLoadData'));
    } finally {
      setIsLoading(false);
    }
  }, [game.id, t]);

  useEffect(() => {
    loadSnapshots();
    checkProcess();

    const interval = setInterval(checkProcess, 5000);
    return () => clearInterval(interval);
  }, [loadSnapshots, checkProcess]);

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setError(null);
    setLoading(true, t('loading.creatingSnapshot'));

    try {
      const snapshot = await createSnapshot({
        game_id: game.id,
        name: newSnapshotName || undefined,
      });
      setSnapshots([snapshot, ...snapshots]);
      setNewSnapshotName('');
      setIsCreatingSnapshot(false);
    } catch (err) {
      console.log(err)
      setError(err instanceof Error ? err.message : t('errors.failedCreateSnapshot'));
      setIsCreatingSnapshot(false);
    } finally {
      setLoading(false, '');
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (isProcessRunningState) {
      setError(`${game.exe_name} ${t('gameDetail.gameRunning')}`);
      return;
    }

    if (!confirm(t('gameDetail.confirmRestore'))) {
      return;
    }

    setError(null);
    setRestoreResult(null);
    setLoading(true, t('loading.restoring'));

    try {
      const result = await restoreSnapshot(snapshotId, game.id);
      setRestoreResult({
        success: result.success,
        message: result.message
      });
      if (result.success) {
        loadSnapshots();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedRestore'));
    } finally {
      setLoading(false, '');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm(t('gameDetail.confirmDeleteSnapshot'))) {
      return;
    }

    setLoading(true, t('loading.deleting'));

    try {
      await deleteSnapshot(snapshotId, game.id);
      setSnapshots(snapshots.filter(s => s.id !== snapshotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedDeleteSnapshot'));
    } finally {
      setLoading(false, '');
    }
  };

  const handleDeleteGame = async () => {
    const message = t('gameDetail.confirmDeleteGame').replace('{name}', game.name);
    if (!confirm(message)) {
      return;
    }

    setLoading(true, t('loading.deleting'));

    try {
      await deleteGame(game.id);
      onGameDeleted(game.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedDeleteGame'));
      setLoading(false, '');
    }
  };

  const handleRenameStart = (snapshot: Snapshot) => {
    setEditingSnapshot(snapshot.id);
    setEditName(snapshot.name);
  };

  const handleRenameSave = async (snapshotId: string) => {
    if (!editName.trim()) {
      setEditingSnapshot(null);
      return;
    }

    try {
      await renameSnapshot(snapshotId, game.id, editName.trim());
      setSnapshots(snapshots.map(s =>
        s.id === snapshotId ? { ...s, name: editName.trim() } : s
      ));
      setEditingSnapshot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedRename'));
    }
  };

  const handleUploadToCloud = async (snapshot: Snapshot) => {
    if (!isAuthenticated) {
      setError('Please sign in with Google first');
      return;
    }

    setIsUploading(true);
    setCloudSyncState({ sync_status: 'syncing' });
    setLoading(true, 'Preparing upload...');

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Failed to get valid access token');
      }

      // Read the snapshot files and create a zip
      setLoading(true, 'Reading snapshot files...');
      const { readDir, readFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      
      // Get snapshot directory path
      const snapshotPath = snapshot.path;
      
      // Read all files in the snapshot directory recursively
      const files: { path: string; content: Uint8Array }[] = [];
      
      async function readDirectoryRecursive(dirPath: string, relativePath: string = '') {
        const entries = await readDir(dirPath);
        
        for (const entry of entries) {
          const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          const entryFullPath = await join(dirPath, entry.name);
          
          if (entry.isDirectory) {
            await readDirectoryRecursive(entryFullPath, entryRelativePath);
          } else if (entry.isFile && entry.name !== '.checkpoint-meta.json') {
            const content = await readFile(entryFullPath);
            files.push({ path: entryRelativePath, content });
          }
        }
      }
      
      await readDirectoryRecursive(snapshotPath);
      
      // Create zip using JSZip
      setLoading(true, 'Creating zip archive...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata: { percent: number }) => {
        setLoading(true, `Creating zip... ${Math.round(metadata.percent)}%`);
      });

      // Upload to Google Drive
      setLoading(true, 'Uploading to cloud...');
      await uploadSnapshot(
        token,
        game.id,
        snapshot.name,
        zipBlob,
        (progress) => {
          setLoading(true, `Uploading... ${Math.round(progress)}%`);
        }
      );

      setCloudSyncState({
        sync_status: 'idle',
        last_upload: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload to cloud');
      setCloudSyncState({
        sync_status: 'error',
        error_message: err instanceof Error ? err.message : 'Upload failed'
      });
    } finally {
      setIsUploading(false);
      setLoading(false, '');
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!isAuthenticated) {
      setError('Please sign in with Google first');
      return;
    }

    setIsDownloading(true);
    setCloudSyncState({ sync_status: 'syncing' });
    setLoading(true, 'Checking cloud snapshots...');

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Failed to get valid access token');
      }

      // List cloud snapshots
      const cloudSnapshots = await listCloudSnapshots(token, game.id);
      if (cloudSnapshots.length === 0) {
        setError('No cloud snapshots found for this game');
        setCloudSyncState({ sync_status: 'idle' });
        return;
      }

      // For now, download the most recent one
      const latestSnapshot = cloudSnapshots.sort((a, b) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )[0];

      setLoading(true, 'Downloading from cloud...');
      const blob = await downloadSnapshot(token, latestSnapshot.id, (progress) => {
        setLoading(true, `Downloading... ${Math.round(progress)}%`);
      });

      // Create a new local snapshot from the downloaded file
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const newSnapshot = await importSnapshot(
        game.id,
        latestSnapshot.name.replace('.zip', ''),
        uint8Array
      );
      setSnapshots([newSnapshot, ...snapshots]);
      
      setCloudSyncState({
        sync_status: 'idle',
        last_download: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download from cloud');
      setCloudSyncState({
        sync_status: 'error',
        error_message: err instanceof Error ? err.message : 'Download failed'
      });
    } finally {
      setIsDownloading(false);
      setLoading(false, '');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="game-detail">
      <div className="game-detail-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t('gameDetail.back')}
        </button>
        <h2>{game.name}</h2>
        <div className="game-detail-info">
          <p>{t('gameDetail.saveLocation')}: {game.save_location}</p>
          {game.exe_name && <p>{t('gameDetail.executable')}: {game.exe_name}</p>}
        </div>
      </div>

      {isProcessRunningState && (
        <div className="alert alert-warning">
          <AlertTriangle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {game.exe_name} {t('gameDetail.gameRunning')}
        </div>
      )}

      {restoreResult && (
        <div className={`alert ${restoreResult.success ? 'alert-success' : 'alert-error'}`}>
          {restoreResult.success ? (
            <CheckCircle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          ) : (
            <AlertTriangle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          )}
          {restoreResult.message}
        </div>
      )}

      {/* Cloud Sync Section */}
      {isAuthenticated ? (
        <div className="cloud-sync-section">
          <div className="cloud-sync-header">
            <Cloud size={18} />
            <h3>Cloud Backup</h3>
          </div>
          
          <div className="backup-destination">
            <label>Backup Destination:</label>
            <select 
              value={backupDestination}
              onChange={(e) => setBackupDestination(e.target.value as 'local' | 'cloud' | 'both')}
              className="backup-destination-select"
            >
              <option value="local">Local Only</option>
              <option value="cloud">Cloud Only</option>
              <option value="both">Local & Cloud</option>
            </select>
          </div>

          <div className="cloud-sync-actions">
            <button
              className="btn btn-secondary btn-small"
              onClick={handleDownloadFromCloud}
              disabled={isDownloading}
              title="Download latest from cloud"
            >
              {isDownloading ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <CloudDownload size={16} />
              )}
              <span>Download from Cloud</span>
            </button>
          </div>

          {cloudSyncState.sync_status === 'syncing' && (
            <div className="cloud-sync-status syncing">
              <Loader2 size={14} className="spinner" />
              <span>Syncing...</span>
            </div>
          )}
          
          {cloudSyncState.sync_status === 'error' && cloudSyncState.error_message && (
            <div className="cloud-sync-status error">
              <AlertTriangle size={14} />
              <span>{cloudSyncState.error_message}</span>
            </div>
          )}
          
          {cloudSyncState.last_upload && (
            <div className="cloud-sync-status success">
              <CheckCircle size={14} />
              <span>Last uploaded: {new Date(cloudSyncState.last_upload).toLocaleString()}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="cloud-sync-section cloud-sync-login-prompt">
          <div className="cloud-sync-header">
            <Cloud size={18} />
            <h3>Cloud Backup</h3>
          </div>
          <p className="cloud-login-text">Sign in with Google to enable cloud backup</p>
          <p className="cloud-login-hint">Click the profile card in the sidebar to sign in</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="snapshots-section">
        <div className="snapshots-header">
          <h3>{t('gameDetail.snapshots')}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Edit Game
            </button>
            <button
              className="btn btn-danger btn-small"
              onClick={handleDeleteGame}
            >
              <Trash2 size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {t('gameDetail.deleteGame')}
            </button>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setIsCreatingSnapshot(true)}
              disabled={isCreatingSnapshot}
            >
              <Plus size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {t('gameDetail.createSnapshot')}
            </button>
          </div>
        </div>

        {isCreatingSnapshot && (
          <div className="snapshot-item" style={{ marginBottom: '1rem', background: 'var(--bg-tertiary)' }}>
            <div className="snapshot-info" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder={t('gameDetail.snapshotNamePlaceholder')}
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.25rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="snapshot-actions">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setIsCreatingSnapshot(false);
                  setNewSnapshotName('');
                }}
              >
                {t('gameDetail.cancel')}
              </button>
              <button
                className="btn btn-success btn-small"
                onClick={handleCreateSnapshot}
              >
                {t('gameDetail.create')}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p>{t('loading.loading')}...</p>
        ) : snapshots.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
            {t('gameDetail.noSnapshots')}
          </p>
        ) : (
          <div className="snapshot-list">
            {snapshots.map(snapshot => (
              <div key={snapshot.id} className="snapshot-item">
                <div className="snapshot-info">
                  {editingSnapshot === snapshot.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRenameSave(snapshot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave(snapshot.id);
                        if (e.key === 'Escape') setEditingSnapshot(null);
                      }}
                      autoFocus
                      style={{
                        padding: '0.25rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--accent)',
                        borderRadius: '0.25rem',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    />
                  ) : (
                    <h4>{snapshot.name}</h4>
                  )}
                  <p>
                    {formatDate(snapshot.timestamp)} • {formatSize(snapshot.size)} • {snapshot.file_count} files
                  </p>
                </div>
                <div className="snapshot-actions">
                  {isAuthenticated && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleUploadToCloud(snapshot)}
                      disabled={isUploading}
                      title="Upload to cloud"
                    >
                      {isUploading ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <CloudUpload size={16} />
                      )}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleRenameStart(snapshot)}
                    title={t('gameDetail.rename')}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="btn btn-success btn-small"
                    onClick={() => handleRestore(snapshot.id)}
                    disabled={isProcessRunningState}
                    title={t('gameDetail.restore')}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteSnapshot(snapshot.id)}
                    title={t('gameDetail.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <EditGameModal
          game={game}
          onClose={() => setIsEditModalOpen(false)}
          onGameUpdated={(updatedGame) => {
            onGameUpdated(updatedGame);
            setIsEditModalOpen(false);
          }}
          setLoading={setLoading}
        />
      )}
    </div>
  );
}
