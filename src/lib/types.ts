export interface Game {
  id: string;
  name: string;
  save_location: string;
  exe_name?: string;
  cover_image?: string;
  created_at: string;
}

export interface Snapshot {
  id: string;
  game_id: string;
  timestamp: string;
  name: string;
  path: string;
  size: number;
  file_count: number;
}

export interface Config {
  games: Game[];
  backup_location: string;
}

export interface CreateSnapshotRequest {
  game_id: string;
  name?: string;
}

export interface AddGameRequest {
  name: string;
  save_location: string;
  exe_name?: string;
  cover_image?: string;
}

export interface UpdateGameRequest {
  game_id: string;
  name?: string;
  save_location?: string;
  exe_name?: string;
  cover_image?: string;
}

export interface RestoreResult {
  success: boolean;
  backed_up_current: boolean;
  backup_snapshot_id?: string;
  message: string;
}

export interface UserProfile {
  mode: 'local' | 'google';
  name: string;
  email?: string;
  avatar_url?: string;
  google_id?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
  last_sync?: string;
}

export interface CloudSyncState {
  last_upload?: string;
  last_download?: string;
  sync_status: 'idle' | 'syncing' | 'error';
  error_message?: string;
}

export interface GameWithBackupConfig extends Game {
  backup_destination: 'local' | 'cloud' | 'both';
  cloud_sync_state?: CloudSyncState;
}
