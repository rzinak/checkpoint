import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface CloudBackupInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudBackupInfo({ isOpen, onClose }: CloudBackupInfoProps) {
  const { t } = useI18n();
  const [mouseDownOnOverlay, setMouseDownOnOverlay] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => setMouseDownOnOverlay(e.target === e.currentTarget)}
      onMouseUp={(e) => {
        if (mouseDownOnOverlay && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-content info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('cloud.howItWorks')}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <h4>{t('cloud.backupDestination')}</h4>
            <p>{t('cloudInfo.chooseWhere')}</p>
            <ul>
              <li><strong>{t('cloud.localOnly')}</strong> - {t('cloudInfo.localOnlyDesc')}</li>
              <li><strong>{t('cloud.both')}</strong> - {t('cloudInfo.bothDesc')}</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>{t('cloudInfo.uploadTitle')}</h4>
            <p>{t('cloudInfo.uploadDesc')}</p>
          </div>

          <div className="info-section">
            <h4>{t('cloudInfo.downloadTitle')}</h4>
            <p>{t('cloudInfo.downloadDesc')}</p>
          </div>

          <div className="info-section">
            <h4>{t('cloud.namingSaves')}</h4>
            <p>{t('cloudInfo.namingDesc')}</p>
            <ul>
              <li><strong>{t('cloudInfo.example1')}</strong></li>
              <li><strong>{t('cloudInfo.example2')}</strong></li>
              <li><strong>{t('cloudInfo.example3')}</strong></li>
            </ul>
            <p>{t('cloudInfo.namingNote')}</p>
          </div>

          <div className="info-section">
            <h4>{t('cloudInfo.syncTitle')}</h4>
            <p>{t('cloudInfo.syncDesc')}</p>
            <ul>
              <li><strong>{t('cloud.lastUploaded')}</strong> - {t('cloudInfo.lastUploadedDesc')}</li>
              <li><strong>{t('cloud.lastDownloaded')}</strong> - {t('cloudInfo.lastDownloadedDesc')}</li>
              <li><strong>{t('cloud.errorMessages')}</strong> - {t('cloudInfo.errorMessagesDesc')}</li>
            </ul>
          </div>

          <div className="info-section info-note">
            <p><strong>{t('cloudInfo.noteTitle')}</strong> {t('cloudInfo.noteDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
