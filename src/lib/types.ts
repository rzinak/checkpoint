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
