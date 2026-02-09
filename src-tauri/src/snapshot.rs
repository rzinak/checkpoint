use crate::game::Game;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: String,
    pub game_id: String,
    pub timestamp: DateTime<Utc>,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub file_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct CreateSnapshotRequest {
    pub game_id: String,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RestoreResult {
    pub success: bool,
    pub backed_up_current: bool,
    pub backup_snapshot_id: Option<String>,
    pub message: String,
}

pub fn create_snapshot(
    request: &CreateSnapshotRequest,
    backup_location: &str,
) -> Result<Snapshot, String> {
    let config = crate::config::Config::load()?;
    let game = config
        .games
        .iter()
        .find(|g| g.id == request.game_id)
        .ok_or("Game not found")?;

    let save_path = Path::new(&game.save_location);
    if !save_path.exists() {
        return Err(format!(
            "Save location does not exist: {}",
            game.save_location
        ));
    }

    let timestamp = Utc::now();
    let snapshot_id = Uuid::new_v4().to_string();
    let snapshot_name = request
        .name
        .clone()
        .unwrap_or_else(|| timestamp.format("%Y-%m-%d_%H-%M-%S").to_string());

    let snapshot_dir = Path::new(backup_location)
        .join(&request.game_id)
        .join(&snapshot_id);

    fs::create_dir_all(&snapshot_dir)
        .map_err(|e| format!("Failed to create snapshot directory: {}", e))?;

    let mut total_size: u64 = 0;
    let mut file_count: usize = 0;

    for entry in WalkDir::new(&save_path) {
        let entry = entry.map_err(|e| format!("Failed to read directory: {}", e))?;
        let path = entry.path();

        if path.is_file() {
            let relative_path = path
                .strip_prefix(&save_path)
                .map_err(|e| format!("Failed to calculate relative path: {}", e))?;

            let dest_path = snapshot_dir.join(relative_path);

            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }

            fs::copy(path, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

            let metadata =
                fs::metadata(&dest_path).map_err(|e| format!("Failed to get metadata: {}", e))?;
            total_size += metadata.len();
            file_count += 1;
        }
    }

    let metadata = SnapshotMetadata {
        id: snapshot_id.clone(),
        game_id: request.game_id.clone(),
        timestamp,
        name: snapshot_name.clone(),
        size: total_size,
        file_count,
    };

    let metadata_path = snapshot_dir.join(".checkpoint-meta.json");
    let metadata_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(Snapshot {
        id: snapshot_id,
        game_id: request.game_id.clone(),
        timestamp,
        name: snapshot_name,
        path: snapshot_dir.to_string_lossy().to_string(),
        size: total_size,
        file_count,
    })
}

pub fn list_snapshots(game_id: &str, backup_location: &str) -> Result<Vec<Snapshot>, String> {
    let game_dir = Path::new(backup_location).join(game_id);

    if !game_dir.exists() {
        return Ok(Vec::new());
    }

    let mut snapshots = Vec::new();

    for entry in
        fs::read_dir(&game_dir).map_err(|e| format!("Failed to read snapshots directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let metadata_path = path.join(".checkpoint-meta.json");
            if metadata_path.exists() {
                let contents = fs::read_to_string(&metadata_path)
                    .map_err(|e| format!("Failed to read metadata: {}", e))?;
                let metadata: SnapshotMetadata = serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to parse metadata: {}", e))?;

                snapshots.push(Snapshot {
                    id: metadata.id,
                    game_id: metadata.game_id,
                    timestamp: metadata.timestamp,
                    name: metadata.name,
                    path: path.to_string_lossy().to_string(),
                    size: metadata.size,
                    file_count: metadata.file_count,
                });
            }
        }
    }

    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(snapshots)
}

pub fn restore_snapshot(
    snapshot_id: &str,
    game: &Game,
    backup_location: &str,
) -> Result<RestoreResult, String> {
    if let Some(ref exe_name) = game.exe_name {
        if crate::process::is_process_running(exe_name)? {
            return Ok(RestoreResult {
                success: false,
                backed_up_current: false,
                backup_snapshot_id: None,
                message: format!(
                    "Cannot restore: {} is currently running. Please close the game first.",
                    exe_name
                ),
            });
        }
    }

    let snapshot_path = Path::new(backup_location).join(&game.id).join(snapshot_id);

    if !snapshot_path.exists() {
        return Err("Snapshot not found".to_string());
    }

    if !verify_snapshot_internal(&snapshot_path)? {
        return Ok(RestoreResult {
            success: false,
            backed_up_current: false,
            backup_snapshot_id: None,
            message: "Snapshot verification failed. Files may be corrupted.".to_string(),
        });
    }

    let save_path = Path::new(&game.save_location);
    let mut backed_up_current = false;
    let mut backup_snapshot_id = None;

    if save_path.exists() {
        let current_backup_id = Uuid::new_v4().to_string();
        let current_backup_path = Path::new(backup_location)
            .join(&game.id)
            .join(&current_backup_id);

        fs::create_dir_all(&current_backup_path)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;

        let mut total_size: u64 = 0;
        let mut file_count: usize = 0;

        for entry in WalkDir::new(&save_path) {
            let entry = entry.map_err(|e| format!("Failed to read directory: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                let relative_path = path
                    .strip_prefix(&save_path)
                    .map_err(|e| format!("Failed to calculate relative path: {}", e))?;
                let dest_path = current_backup_path.join(relative_path);

                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Failed to create directory: {}", e))?;
                }

                fs::copy(path, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;

                let metadata = fs::metadata(&dest_path)
                    .map_err(|e| format!("Failed to get metadata: {}", e))?;
                total_size += metadata.len();
                file_count += 1;
            }
        }

        let timestamp = Utc::now();
        let metadata = SnapshotMetadata {
            id: current_backup_id.clone(),
            game_id: game.id.clone(),
            timestamp,
            name: format!(
                "Auto-backup before restore {}",
                timestamp.format("%Y-%m-%d %H:%M:%S")
            ),
            size: total_size,
            file_count,
        };

        let metadata_path = current_backup_path.join(".checkpoint-meta.json");
        let metadata_json = serde_json::to_string_pretty(&metadata)
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
        fs::write(&metadata_path, metadata_json)
            .map_err(|e| format!("Failed to write metadata: {}", e))?;

        backed_up_current = true;
        backup_snapshot_id = Some(current_backup_id);

        for entry in
            fs::read_dir(&save_path).map_err(|e| format!("Failed to read save directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            if path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to remove directory: {}", e))?;
            } else {
                fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))?;
            }
        }
    } else {
        fs::create_dir_all(&save_path)
            .map_err(|e| format!("Failed to create save directory: {}", e))?;
    }

    let snapshot_data_path = &snapshot_path;
    for entry in WalkDir::new(snapshot_data_path) {
        let entry = entry.map_err(|e| format!("Failed to read directory: {}", e))?;
        let path = entry.path();

        if path.file_name() == Some(std::ffi::OsStr::new(".checkpoint-meta.json")) {
            continue;
        }

        if path.is_file() {
            let relative_path = path
                .strip_prefix(snapshot_data_path)
                .map_err(|e| format!("Failed to calculate relative path: {}", e))?;
            let dest_path = save_path.join(relative_path);

            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }

            fs::copy(path, &dest_path).map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(RestoreResult {
        success: true,
        backed_up_current,
        backup_snapshot_id,
        message: "Restore completed successfully".to_string(),
    })
}

pub fn delete_snapshot(
    snapshot_id: &str,
    game_id: &str,
    backup_location: &str,
) -> Result<(), String> {
    let snapshot_path = Path::new(backup_location).join(game_id).join(snapshot_id);

    if !snapshot_path.exists() {
        return Err("Snapshot not found".to_string());
    }

    fs::remove_dir_all(&snapshot_path).map_err(|e| format!("Failed to delete snapshot: {}", e))?;

    Ok(())
}

pub fn rename_snapshot(
    snapshot_id: &str,
    game_id: &str,
    new_name: &str,
    backup_location: &str,
) -> Result<(), String> {
    let snapshot_path = Path::new(backup_location).join(game_id).join(snapshot_id);

    let metadata_path = snapshot_path.join(".checkpoint-meta.json");

    if !metadata_path.exists() {
        return Err("Snapshot metadata not found".to_string());
    }

    let contents = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let mut metadata: SnapshotMetadata =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse metadata: {}", e))?;

    metadata.name = new_name.to_string();

    let metadata_json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

pub fn verify_snapshot(
    snapshot_id: &str,
    game_id: &str,
    backup_location: &str,
) -> Result<bool, String> {
    let snapshot_path = Path::new(backup_location).join(game_id).join(snapshot_id);

    verify_snapshot_internal(&snapshot_path)
}

fn verify_snapshot_internal(snapshot_path: &Path) -> Result<bool, String> {
    let metadata_path = snapshot_path.join(".checkpoint-meta.json");

    if !metadata_path.exists() {
        return Ok(false);
    }

    let contents = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let metadata: SnapshotMetadata =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse metadata: {}", e))?;

    let mut actual_file_count: usize = 0;
    let mut actual_size: u64 = 0;

    for entry in WalkDir::new(snapshot_path) {
        let entry = entry.map_err(|e| format!("Failed to read directory: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.file_name() != Some(std::ffi::OsStr::new(".checkpoint-meta.json"))
        {
            actual_file_count += 1;
            let metadata =
                fs::metadata(path).map_err(|e| format!("Failed to get metadata: {}", e))?;
            actual_size += metadata.len();
        }
    }

    let size_matches = actual_size == metadata.size;
    let count_matches = actual_file_count == metadata.file_count;

    Ok(size_matches && count_matches)
}

#[derive(Debug, Serialize, Deserialize)]
struct SnapshotMetadata {
    id: String,
    game_id: String,
    timestamp: DateTime<Utc>,
    name: String,
    size: u64,
    file_count: usize,
}
