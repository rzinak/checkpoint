import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <Loader2 size={40} className="loading-spinner-icon" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
}
