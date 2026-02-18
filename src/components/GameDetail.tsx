import { useState, useEffect, useCallback } from 'react';
import {
  listSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  renameSnapshot,
  deleteGame,
  isProcessRunning,
  importSnapshot,
  openFolder
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useProfile } from '../lib/profileContext';
import { useToast } from '../lib/toastContext';
import { uploadSnapshot, listCloudSnapshots, /* downloadSnapshot */ } from '../lib/googleDrive';
import type { Game, Snapshot, CloudSyncState } from '../lib/types';
import { ArrowLeft, Plus, RotateCcw, Trash2, Edit3, CheckCircle, AlertTriangle, Cloud, CloudUpload, /* CloudDownload, */ Loader2, Info, RefreshCw, FolderOpen } from 'lucide-react';
import { EditGameModal } from './EditGameModal';
import { CloudBackupInfo } from './CloudBackupInfo';
import { CloudBackupListModal } from './CloudBackupListModal';
import { ConfirmModal } from './ConfirmModal';
import { Select } from './ui';
import { deleteCloudSnapshot } from '../lib/googleDrive';

interface GameDetailProps {
  game: Game;
  onBack: () => void;
  onGameDeleted: (gameId: string) => void;
  onGameUpdated: (game: Game) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export function GameDetail({ game, onBack, onGameDeleted, onGameUpdated, setLoading }: GameDetailProps) {
  const { t, language } = useI18n();
  const { isAuthenticated, getValidAccessToken } = useProfile();
  const { addToast, addNotification } = useToast();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [isProcessRunningState, setIsProcessRunningState] = useState(false);

  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({ sync_status: 'idle' });
  const [backupDestination, setBackupDestination] = useState<'local' | 'cloud' | 'both'>(() => {
    const saved = localStorage.getItem(`checkpoint-backup-dest-${game.id}`);
    return (saved === 'local' || saved === 'cloud' || saved === 'both') ? saved : 'local';
  });
  const [isUploading, setIsUploading] = useState(false);
  // const [isDownloading, setIsDownloading] = useState(false);
  const [isCloudInfoOpen, setIsCloudInfoOpen] = useState(false);
  const [isCloudBackupListOpen, setIsCloudBackupListOpen] = useState(false);
  const [saveFolderExists, setSaveFolderExists] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const [cloudSnapshots, setCloudSnapshots] = useState<Map<string, { id: string; modifiedTime: string }>>(new Map());
  const [isLoadingCloudList, setIsLoadingCloudList] = useState(false);

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

  const checkSaveFolderExists = useCallback(async () => {
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      const exists_result = await exists(game.save_location);
      setSaveFolderExists(exists_result);
    } catch (err) {
      console.error('Failed to check save folder:', err);
      setSaveFolderExists(false);
    }
  }, [game.save_location]);

  const handleBrowseSaveFolder = async () => {
    try {
      await openFolder(game.save_location);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('errors.failedSelectFolder');
      addToast(errorMsg, 'error');
      addNotification(
        t('errors.failedSelectFolder'),
        errorMsg,
        'error'
      );
    }
  };

  const loadSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);

      const data = await listSnapshots(game.id);
      setSnapshots(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('errors.failedLoadData');
      addToast(errorMsg, 'error');
      addNotification(
        t('errors.failedLoadData'),
        errorMsg,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }, [game.id, t]);

  useEffect(() => {
    loadSnapshots();
    checkProcess();
    checkSaveFolderExists();

    const interval = setInterval(checkProcess, 5000);
    return () => clearInterval(interval);
  }, [loadSnapshots, checkProcess, checkSaveFolderExists]);

  useEffect(() => {
    console.log('Saving backup destination:', backupDestination, 'for game:', game.id);
    localStorage.setItem(`checkpoint-backup-dest-${game.id}`, backupDestination);
  }, [backupDestination, game.id]);

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setLoading(true, t('loading.creatingSnapshot'));

    try {
      const snapshot = await createSnapshot({
        game_id: game.id,
        name: newSnapshotName || undefined,
      });

      if ((backupDestination === 'cloud' || backupDestination === 'both') && isAuthenticated) {
        setLoading(true, t('loading.uploadingCloud'));
        try {
          await handleUploadToCloud(snapshot);
        } catch (uploadErr) {
          console.error('Auto-upload to cloud failed:', uploadErr);
          addToast(t('cloud.uploadFailed'), 'warning');
        }
      }

      setSnapshots([snapshot, ...snapshots]);
      setNewSnapshotName('');
      setIsCreatingSnapshot(false);
      addToast(t('success.snapshotCreated'), 'success');
      addNotification(
        t('success.snapshotCreated'),
        `"${snapshot.name}" - ${game.name}`,
        'success'
      );
    } catch (err) {
      console.log(err)
      const errorMsg = err instanceof Error ? err.message : t('errors.failedCreateSnapshot');
      addToast(errorMsg, 'error');
      addNotification(
        t('errors.failedCreateSnapshot'),
        errorMsg,
        'error'
      );
      setIsCreatingSnapshot(false);
    } finally {
      setLoading(false, '');
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (isProcessRunningState) {
      addToast(`${game.exe_name} ${t('gameDetail.gameRunning')}`, 'warning');
      return;
    }

    const snapshotToRestore = snapshots.find(s => s.id === snapshotId);

    setConfirmModal({
      isOpen: true,
      title: t('gameDetail.restore'),
      message: t('gameDetail.confirmRestore'),
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true, t('loading.restoring'));

        try {
          const result = await restoreSnapshot(snapshotId, game.id);
          if (result.success) {
            addToast(t('success.restoreComplete'), 'success');
            addNotification(
              t('success.restoreComplete'),
              `"${snapshotToRestore?.name || snapshotId}" - ${game.name}`,
              'success'
            );
            loadSnapshots();
          } else {
            addToast(result.message, 'error');
            addNotification(
              t('errors.failedRestore'),
              result.message,
              'error'
            );
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : t('errors.failedRestore');
          addToast(errorMsg, 'error');
          addNotification(
            t('errors.failedRestore'),
            errorMsg,
            'error'
          );
        } finally {
          setLoading(false, '');
        }
      }
    });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const snapshotToDelete = snapshots.find(s => s.id === snapshotId);
    setConfirmModal({
      isOpen: true,
      title: t('gameDetail.deleteSnapshot'),
      message: t('gameDetail.confirmDeleteSnapshot'),
      danger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true, t('loading.deleting'));

        try {
          await deleteSnapshot(snapshotId, game.id);
          setSnapshots(snapshots.filter(s => s.id !== snapshotId));
          addToast(t('success.snapshotDeleted'), 'success');
          addNotification(
            t('success.snapshotDeleted'),
            `"${snapshotToDelete?.name || snapshotId}" - ${game.name}`,
            'success'
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : t('errors.failedDeleteSnapshot');
          addToast(errorMsg, 'error');
          addNotification(
            t('errors.failedDeleteSnapshot'),
            errorMsg,
            'error'
          );
        } finally {
          setLoading(false, '');
        }
      }
    });
  };

  const handleDeleteCloudSnapshot = (snapshot: Snapshot) => {
    const cloudData = cloudSnapshots.get(snapshot.id);
    if (!cloudData) {
      addToast(t('cloud.notInCloud'), 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: t('cloud.deleteFromCloud'),
      message: t('cloud.confirmDelete').replace('{name}', snapshot.name),
      danger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true, t('loading.deletingCloud'));

        try {
          const token = await getValidAccessToken();
          if (!token) {
            throw new Error('Not authenticated');
          }
          await deleteCloudSnapshot(token, cloudData.id);
          setCloudSnapshots(prev => {
            const next = new Map(prev);
            next.delete(snapshot.id);
            return next;
          });
          addToast(t('cloud.deleteSuccess'), 'success');
          addNotification(
            t('cloud.deleteSuccess'),
            `"${snapshot.name}" - ${game.name}`,
            'success'
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : t('errors.failedDeleteCloud');
          addToast(errorMsg, 'error');
          addNotification(
            t('errors.failedDeleteCloud'),
            errorMsg,
            'error'
          );
        } finally {
          setLoading(false, '');
        }
      }
    });
  };

  const handleDeleteGame = () => {
    const message = t('gameDetail.confirmDeleteGame').replace('{name}', game.name);
    setConfirmModal({
      isOpen: true,
      title: t('gameDetail.deleteGame'),
      message: message,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(true, t('loading.deleting'));

        try {
          await deleteGame(game.id);
          setLoading(false, '');
          onGameDeleted(game.id);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : t('errors.failedDeleteGame');
          addToast(errorMsg, 'error');
          addNotification(
            t('errors.failedDeleteGame'),
            errorMsg,
            'error'
          );
          setLoading(false, '');
        }
      }
    });
  };

  const loadCloudSnapshots = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping cloud load');
      return;
    }

    console.log('Loading cloud snapshots for game:', game.id);
    console.log('Current snapshots:', snapshots.map(s => s.name));

    setIsLoadingCloudList(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        console.log('No valid token');
        return;
      }

      const cloudFiles = await listCloudSnapshots(token, game.id);
      console.log('Cloud files found:', cloudFiles);

      setCloudSnapshots(prev => {
        const cloudMap = new Map(prev);

        cloudFiles.forEach(file => {
          console.log('Processing cloud file:', file.name);
          const nameParts = file.name.split('/');
          if (nameParts.length === 2) {
            const snapshotName = nameParts[1].replace('.zip', '');
            console.log('Looking for snapshot with name:', snapshotName);
            const matchingSnapshot = snapshots.find(s => s.name === snapshotName);
            if (matchingSnapshot) {
              console.log('Found matching snapshot:', matchingSnapshot.id);
              cloudMap.set(matchingSnapshot.id, { id: file.id, modifiedTime: file.modifiedTime });
            } else {
              console.log('No matching snapshot found for:', snapshotName);
            }
          }
        });

        console.log('Cloud map created:', cloudMap);
        return cloudMap;
      });
    } catch (err) {
      console.error('Failed to load cloud snapshots:', err);
    } finally {
      setIsLoadingCloudList(false);
    }
  };

  useEffect(() => {
    loadCloudSnapshots();
  }, [snapshots, isAuthenticated]);

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
      const errorMsg = err instanceof Error ? err.message : t('errors.failedRename');
      addToast(errorMsg, 'error');
      addNotification(
        t('errors.failedRename'),
        errorMsg,
        'error'
      );
    }
  };

  const handleUploadToCloud = async (snapshot: Snapshot) => {
    if (!isAuthenticated) {
      addToast(t('cloud.notAuthenticated'), 'warning');
      return;
    }

    setIsUploading(true);
    setCloudSyncState({ sync_status: 'syncing' });
    setLoading(true, t('loading.preparingUpload'));

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Failed to get valid access token');
      }

      setLoading(true, t('loading.readingFiles'));
      const { readDir, readFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');

      const snapshotPath = snapshot.path;

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

      setLoading(true, t('loading.creatingZip'));
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const file of files) {
        zip.file(file.path, file.content);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata: { percent: number }) => {
        setLoading(true, `Creating zip... ${Math.round(metadata.percent)}%`);
      });

      setLoading(true, t('loading.uploadingCloud'));
      const fileId = await uploadSnapshot(
        token,
        game.id,
        snapshot.name,
        zipBlob
      );

      setCloudSnapshots(prev => {
        const next = new Map(prev);
        next.set(snapshot.id, {
          id: fileId,
          modifiedTime: new Date().toISOString()
        });
        return next;
      });

      setCloudSyncState({
        sync_status: 'idle',
        last_upload: new Date().toISOString()
      });
      addToast(t('cloud.uploadSuccess'), 'success');
      addNotification(t('cloud.uploadComplete'), `"${snapshot.name}" - ${game.name}`, 'success');

      loadCloudSnapshots();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('errors.failedUploadCloud');
      addToast(errorMsg, 'error');
      addNotification(
        t('errors.failedUploadCloud'),
        errorMsg,
        'error'
      );
      setCloudSyncState({
        sync_status: 'error',
        error_message: errorMsg
      });
    } finally {
      setIsUploading(false);
      setLoading(false, '');
    }
  };

  /*
  const handleDownloadFromCloud = async () => {
    if (!isAuthenticated) {
      addToast('Please sign in with Google first', 'warning');
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

      console.log('Downloading - looking for cloud snapshots for game:', game.id);
      const cloudSnapshots = await listCloudSnapshots(token, game.id);
      console.log('Download - cloud snapshots found:', cloudSnapshots);
      
      if (cloudSnapshots.length === 0) {
        addToast('No cloud snapshots found for this game', 'info');
        setCloudSyncState({ sync_status: 'idle' });
        return;
      }

      const latestSnapshot = cloudSnapshots.sort((a, b) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )[0];

      setLoading(true, 'Downloading from cloud...');
      const blob = await downloadSnapshot(token, latestSnapshot.id);

      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const newSnapshot = await importSnapshot(
        game.id,
        latestSnapshot.name.replace('.zip', ''),
        uint8Array
      );
      setSnapshots([newSnapshot, ...snapshots]);

      setCloudSnapshots(prev => {
        const next = new Map(prev);
        next.set(newSnapshot.id, {
          id: latestSnapshot.id,
          modifiedTime: latestSnapshot.modifiedTime
        });
        return next;
      });

      setCloudSyncState({
        sync_status: 'idle',
        last_download: new Date().toISOString()
      });
      addToast(t('cloud.downloadSuccess'), 'success');
      addNotification(t('cloud.downloadSuccess'), `"${latestSnapshot.name.replace('.zip', '')}" - ${game.name}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to download from cloud', 'error');
      setCloudSyncState({
        sync_status: 'error',
        error_message: err instanceof Error ? err.message : 'Download failed'
      });
    } finally {
      setIsDownloading(false);
      setLoading(false, '');
    }
  };
  */

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleString(locale, {
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
          <button
            className="btn btn-secondary btn-small"
            onClick={handleBrowseSaveFolder}
            disabled={!saveFolderExists}
            title={saveFolderExists ? game.save_location : 'Folder not found'}
          >
            <FolderOpen size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {t('gameDetail.browseSaveFolder')}
          </button>
        </div>
      </div>

      {isProcessRunningState && (
        <div className="alert alert-warning">
          <AlertTriangle size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {game.exe_name} {t('gameDetail.gameRunning')}
        </div>
      )}

      {isAuthenticated ? (
        <div className="cloud-sync-section">
          <div className="cloud-sync-header">
            <Cloud size={18} />
            <h3>{t('cloud.title')}</h3>
            {isLoadingCloudList && <Loader2 size={16} className="spinner" />}
            <button
              className="cloud-info-btn"
              onClick={() => setIsCloudInfoOpen(true)}
              title={t('cloud.howItWorks')}
            >
              <Info size={16} />
            </button>
          </div>

          <div className="backup-destination">
            <label>{t('cloud.backupDestination')}:</label>
            <Select
              value={backupDestination}
              onChange={(e) => setBackupDestination(e.target.value as 'local' | 'both')}
              options={[
                { value: 'local', label: t('cloud.localOnly') },
                { value: 'both', label: t('cloud.both') }
              ]}
              className="backup-destination-select"
            />
          </div>

          <div className="cloud-sync-actions">
            {/*
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
            */}
            <button
              className="btn btn-secondary btn-small"
              onClick={loadCloudSnapshots}
              disabled={isLoadingCloudList}
              title={t('cloud.refreshCloudList')}
            >
              {isLoadingCloudList ? (
                <Loader2 size={16} className="spinner" />
              ) : (
                <RefreshCw size={16} />
              )}
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setIsCloudBackupListOpen(true)}
              title={t('cloud.viewAllCloudBackups')}
            >
              <Cloud size={16} />
              <span>{t('cloud.viewAll')}</span>
            </button>
          </div>

          {cloudSyncState.sync_status === 'syncing' && (
            <div className="cloud-sync-status syncing">
              <Loader2 size={14} className="spinner" />
              <span>{t('cloud.syncing')}</span>
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
              <span>{t('cloud.lastUploaded')}: {new Date(cloudSyncState.last_upload).toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US')}</span>
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

      <div className="snapshots-section">
        <div className="snapshots-header">
          <h3>{t('gameDetail.snapshots')}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {t('gameDetail.editGame')}
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
                    {formatDate(snapshot.timestamp)} • {formatSize(snapshot.size)} • {snapshot.file_count} {snapshot.file_count === 1 ? t('cloud.file') : t('cloud.files')}
                    {cloudSnapshots.has(snapshot.id) && (
                      <span className="cloud-badge" title={t('cloud.backedUp')}>
                        <Cloud size={12} /> {t('cloud.badge')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="snapshot-actions">
                  {isAuthenticated && !cloudSnapshots.has(snapshot.id) && backupDestination !== 'local' && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleUploadToCloud(snapshot)}
                      disabled={isUploading}
                      title={t('cloud.uploadToCloud')}
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
                  {cloudSnapshots.has(snapshot.id) && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteCloudSnapshot(snapshot)}
                      title={t('cloud.deleteFromCloud')}
                      style={{ marginLeft: '0.25rem' }}
                    >
                      <Cloud size={16} />
                    </button>
                  )}
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

      <CloudBackupInfo
        isOpen={isCloudInfoOpen}
        onClose={() => setIsCloudInfoOpen(false)}
      />

      <CloudBackupListModal
        isOpen={isCloudBackupListOpen}
        onClose={() => setIsCloudBackupListOpen(false)}
        onDownload={async (gameId, snapshotName, data) => {
          const newSnapshot = await importSnapshot(gameId, snapshotName, data);
          setSnapshots([newSnapshot, ...snapshots]);
          addToast(t('cloud.downloadSuccess'), 'success');
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
