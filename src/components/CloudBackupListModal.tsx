import { useState, useEffect } from 'react';
import { X, Cloud, Folder, FileText, Clock, Database, Loader2, Download, Trash2 } from 'lucide-react';
import { useProfile } from '../lib/profileContext';
import { useToast } from '../lib/toastContext';
import { ConfirmModal } from './ConfirmModal';
import { listAllCloudSnapshots, downloadSnapshot, deleteCloudSnapshot, type CloudBackupItem } from '../lib/googleDrive';

interface CloudBackupListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (gameId: string, snapshotName: string, data: Uint8Array) => void;
}

export function CloudBackupListModal({ isOpen, onClose, onDownload }: CloudBackupListModalProps) {
  const { isAuthenticated, getValidAccessToken } = useProfile();
  const { addToast } = useToast();
  const [backups, setBackups] = useState<CloudBackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<CloudBackupItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; backup: CloudBackupItem | null }>({ isOpen: false, backup: null });

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadBackups();
    }
  }, [isOpen, isAuthenticated]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const allBackups = await listAllCloudSnapshots(token);
      setBackups(allBackups);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load cloud backups', 'error');
    } finally {
      setIsLoading(false);
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (backup: CloudBackupItem) => {
    if (!backup.gameId || !backup.snapshotName) {
      addToast('Cannot download: missing backup information', 'warning');
      return;
    }

    setSelectedBackup(backup);
    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const blob = await downloadSnapshot(token, backup.id);
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      if (onDownload) {
        onDownload(backup.gameId, backup.snapshotName, uint8Array);
      }

      addToast(`Downloaded "${backup.snapshotName}" from cloud`, 'success');
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to download backup', 'error');
    } finally {
      setSelectedBackup(null);
    }
  };

  const handleDelete = (backup: CloudBackupItem) => {
    setConfirmDelete({ isOpen: true, backup });
  };

  const confirmDeleteBackup = async () => {
    if (!confirmDelete.backup) return;

    try {
      const token = await getValidAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await deleteCloudSnapshot(token, confirmDelete.backup.id);
      setBackups(backups.filter(b => b.id !== confirmDelete.backup!.id));
      addToast('Backup deleted from cloud', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete backup', 'error');
    } finally {
      setConfirmDelete({ isOpen: false, backup: null });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cloud-backup-list-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cloud size={20} />
            <h2>Cloud Backups</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
              <Loader2 size={32} className="spinner" style={{ color: 'var(--accent)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading cloud backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--bg-tertiary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cloud size={32} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>No Cloud Backups</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Upload snapshots to the cloud to see them here
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {backups.map(backup => (
                <div
                  key={backup.id}
                  className="cloud-backup-item"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--accent-light)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Folder size={20} style={{ color: 'var(--accent)' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {backup.snapshotName || backup.name.split('/').pop()?.replace('.zip', '') || 'Unknown'}
                      </h4>
                      {backup.gameName && (
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          background: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)'
                        }}>
                          {backup.gameName}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {formatDate(backup.modifiedTime)}
                      </span>
                      {backup.size && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Database size={12} />
                          {formatSize(backup.size)}
                        </span>
                      )}
                      {backup.fileCount && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FileText size={12} />
                          {backup.fileCount} files
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={(e) => { e.stopPropagation(); handleDownload(backup); }}
                      disabled={selectedBackup?.id === backup.id}
                      title="Download this backup"
                    >
                      {selectedBackup?.id === backup.id ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={(e) => { e.stopPropagation(); handleDelete(backup); }}
                      title="Delete from cloud"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <span>{backups.length} backup{backups.length !== 1 ? 's' : ''}</span>
          <button
            className="btn btn-secondary btn-small"
            onClick={loadBackups}
            disabled={isLoading}
          >
            <Loader2 size={14} className={isLoading ? 'spinner' : ''} style={{ marginRight: '0.25rem' }} />
            Refresh
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Cloud Backup"
        message={confirmDelete.backup ? `Are you sure you want to delete "${confirmDelete.backup.snapshotName || confirmDelete.backup.name}" from the cloud? This cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={confirmDeleteBackup}
        onCancel={() => setConfirmDelete({ isOpen: false, backup: null })}
      />
    </div>
  );
}
