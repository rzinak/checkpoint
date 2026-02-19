import { invoke } from '@tauri-apps/api/core';
import type {
  Game,
  Snapshot,
  Config,
  CreateSnapshotRequest,
  AddGameRequest,
  UpdateGameRequest,
  RestoreResult
} from './types';

export const getConfig = (): Promise<Config> =>
  invoke('get_config');

export const setBackupLocation = (path: string): Promise<void> =>
  invoke('set_backup_location', { path });

export const addGame = (request: AddGameRequest): Promise<Game> =>
  invoke('add_game', { request });

export const listGames = (): Promise<Game[]> =>
  invoke('list_games');

export const deleteGame = (gameId: string): Promise<void> =>
  invoke('delete_game', { gameId });

export const updateGame = (request: UpdateGameRequest): Promise<Game> =>
  invoke('update_game', { request });

export const createSnapshot = (request: CreateSnapshotRequest): Promise<Snapshot> =>
  invoke('create_snapshot', { request });

export const listSnapshots = (gameId: string): Promise<Snapshot[]> =>
  invoke('list_snapshots', { gameId });

export const restoreSnapshot = (snapshotId: string, gameId: string): Promise<RestoreResult> =>
  invoke('restore_snapshot', { snapshotId, gameId });

export const deleteSnapshot = (snapshotId: string, gameId: string): Promise<void> =>
  invoke('delete_snapshot', { snapshotId, gameId });

export const renameSnapshot = (snapshotId: string, gameId: string, newName: string): Promise<void> =>
  invoke('rename_snapshot', { snapshotId, gameId, newName });

export const verifySnapshot = (snapshotId: string, gameId: string): Promise<boolean> =>
  invoke('verify_snapshot', { snapshotId, gameId });

export const isProcessRunning = (processName: string): Promise<boolean> =>
  invoke('is_process_running', { processName });

export const selectFolder = (): Promise<string | null> =>
  invoke('select_folder');

export const importSnapshot = (gameId: string, name: string, fileData: Uint8Array): Promise<Snapshot> =>
  invoke('import_snapshot', { gameId, name, fileData });

export const startOAuthServer = (): Promise<number> =>
  invoke('start_oauth_server');

export const waitForOAuthCode = (): Promise<string | null> =>
  invoke('wait_for_oauth_code');

export const stopOAuthServer = (): Promise<void> =>
  invoke('stop_oauth_server');

export const resetCheckpoint = (): Promise<void> =>
  invoke('reset_checkpoint');

export const openFolder = (path: string): Promise<void> =>
  invoke('open_folder', { path });

export const updateLastRestoredSnapshot = (gameId: string, snapshotId: string): Promise<void> =>
  invoke('update_last_restored_snapshot', { gameId, snapshotId });
