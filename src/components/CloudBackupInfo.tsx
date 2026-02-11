import { X } from 'lucide-react';

interface CloudBackupInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudBackupInfo({ isOpen, onClose }: CloudBackupInfoProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>How Cloud Backup Works</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="info-section">
            <h4>Backup Destination</h4>
            <p>Choose where your game saves are stored:</p>
            <ul>
              <li><strong>Local Only</strong> - Saves stay on this computer only</li>
              <li><strong>Cloud Only</strong> - Saves go to Google Drive only (access from anywhere)</li>
              <li><strong>Local & Cloud</strong> - Saves go to both (recommended for safety)</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>Upload to Cloud</h4>
            <p>Click the cloud icon next to any save to upload it to Google Drive. Your saves are stored in a hidden app folder, so they won't clutter your main Drive.</p>
          </div>

          <div className="info-section">
            <h4>Download from Cloud</h4>
            <p>Click "Download from Cloud" to get your latest cloud save. This creates a new local copy you can restore from.</p>
          </div>

          <div className="info-section">
            <h4>Naming Your Saves</h4>
            <p>Cloud saves are stored globally across all games, so use descriptive names you'll recognize later:</p>
            <ul>
              <li><strong>RDR2 - Chapter 3 - 2026-02-11</strong></li>
              <li><strong>Elden Ring - Before Boss Fight</strong></li>
              <li><strong>Cyberpunk 2077 - Act 2 Complete</strong></li>
            </ul>
            <p>If you delete and re-add a game later, you'll need to recognize your saves by their names in "View All".</p>
          </div>

          <div className="info-section">
            <h4>Sync Status</h4>
            <p>The sync indicators show:</p>
            <ul>
              <li><strong>Last uploaded</strong> - When you last backed up to cloud</li>
              <li><strong>Last downloaded</strong> - When you last restored from cloud</li>
              <li><strong>Error messages</strong> - If something goes wrong</li>
            </ul>
          </div>

          <div className="info-section info-note">
            <p><strong>Note:</strong> Uploads are manual - you decide when to back up. We don't auto-sync to give you full control over your saves.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
