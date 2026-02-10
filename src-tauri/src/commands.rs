use crate::config::Config;
use crate::game::{AddGameRequest, Game, UpdateGameRequest};
use crate::snapshot::{CreateSnapshotRequest, RestoreResult, Snapshot};
use crate::AppState;
use base64::{engine::general_purpose, Engine as _};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_config(state: State<AppState>) -> Result<Config, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub fn set_backup_location(path: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.backup_location = path;
    config.save()?;
    Ok(())
}

#[tauri::command]
pub async fn add_game(request: AddGameRequest, state: State<'_, AppState>) -> Result<Game, String> {
    println!("request: {:?}", request);
    let backup_location = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.backup_location.clone()
    };

    let mut game = Game::new(request.name, request.save_location, request.exe_name, None);

    if let Some(cover_data) = request.cover_image {
        let base64_data = if cover_data.contains(',') {
            cover_data
                .split(',')
                .nth(1)
                .unwrap_or(&cover_data)
                .to_string()
        } else {
            cover_data
        };

        match general_purpose::STANDARD.decode(&base64_data) {
            Ok(image_bytes) => {
                let game_dir = std::path::Path::new(&backup_location).join(&game.id);
                std::fs::create_dir_all(&game_dir)
                    .map_err(|e| format!("Failed to create game directory: {}", e))?;

                let cover_path = game_dir.join("cover.png");
                std::fs::write(&cover_path, image_bytes)
                    .map_err(|e| format!("Failed to save cover: {}", e))?;

                game.cover_image = Some("cover.png".to_string());
            }
            Err(e) => {
                eprintln!("Failed to decode cover image: {}", e);
            }
        }
    }

    {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.games.push(game.clone());
        config.save()?;
    }

    Ok(game)
}

#[tauri::command]
pub fn list_games(state: State<AppState>) -> Result<Vec<Game>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.games.clone())
}

#[tauri::command]
pub fn delete_game(game_id: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.games.retain(|g| g.id != game_id);
    config.save()?;

    let snapshot_path = std::path::Path::new(&config.backup_location).join(&game_id);
    if snapshot_path.exists() {
        std::fs::remove_dir_all(&snapshot_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_game(
    request: UpdateGameRequest,
    state: State<'_, AppState>,
) -> Result<Game, String> {
    let backup_location = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.backup_location.clone()
    };

    let mut config = state.config.lock().map_err(|e| e.to_string())?;

    let game_index = config
        .games
        .iter()
        .position(|g| g.id == request.game_id)
        .ok_or("Game not found")?;

    if let Some(name) = request.name {
        config.games[game_index].name = name;
    }
    if let Some(save_location) = request.save_location {
        config.games[game_index].save_location = save_location;
    }
    if let Some(exe_name) = request.exe_name {
        config.games[game_index].exe_name = Some(exe_name);
    }

    if let Some(cover_data) = request.cover_image {
        let game_id = config.games[game_index].id.clone();

        let base64_data = if cover_data.contains(',') {
            cover_data
                .split(',')
                .nth(1)
                .unwrap_or(&cover_data)
                .to_string()
        } else {
            cover_data
        };

        match general_purpose::STANDARD.decode(&base64_data) {
            Ok(image_bytes) => {
                let game_dir = std::path::Path::new(&backup_location).join(&game_id);
                std::fs::create_dir_all(&game_dir)
                    .map_err(|e| format!("Failed to create game directory: {}", e))?;

                let cover_path = game_dir.join("cover.png");
                std::fs::write(&cover_path, image_bytes)
                    .map_err(|e| format!("Failed to save cover: {}", e))?;

                config.games[game_index].cover_image = Some("cover.png".to_string());
            }
            Err(e) => {
                return Err(format!("Failed to decode cover image: {}", e));
            }
        }
    }

    let updated_game = config.games[game_index].clone();
    config.save()?;

    Ok(updated_game)
}

#[tauri::command]
pub async fn create_snapshot(
    request: CreateSnapshotRequest,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let backup_location = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.backup_location.clone()
    };

    tokio::task::spawn_blocking(move || {
        crate::snapshot::create_snapshot(&request, &backup_location)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn list_snapshots(game_id: String, state: State<AppState>) -> Result<Vec<Snapshot>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    crate::snapshot::list_snapshots(&game_id, &config.backup_location)
}

#[tauri::command]
pub async fn restore_snapshot(
    snapshot_id: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<RestoreResult, String> {
    let (game, backup_location) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        let game = config
            .games
            .iter()
            .find(|g| g.id == game_id)
            .cloned()
            .ok_or("Game not found")?;
        (game, config.backup_location.clone())
    };

    tokio::task::spawn_blocking(move || {
        crate::snapshot::restore_snapshot(&snapshot_id, &game, &backup_location)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn delete_snapshot(
    snapshot_id: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let backup_location = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.backup_location.clone()
    };

    tokio::task::spawn_blocking(move || {
        crate::snapshot::delete_snapshot(&snapshot_id, &game_id, &backup_location)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub fn rename_snapshot(
    snapshot_id: String,
    game_id: String,
    new_name: String,
    state: State<AppState>,
) -> Result<(), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    crate::snapshot::rename_snapshot(&snapshot_id, &game_id, &new_name, &config.backup_location)
}

#[tauri::command]
pub fn verify_snapshot(
    snapshot_id: String,
    game_id: String,
    state: State<AppState>,
) -> Result<bool, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    crate::snapshot::verify_snapshot(&snapshot_id, &game_id, &config.backup_location)
}

#[tauri::command]
pub fn is_process_running(process_name: String) -> Result<bool, String> {
    crate::process::is_process_running(&process_name)
}

#[tauri::command]
pub async fn select_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog().file().blocking_pick_folder();

    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn import_snapshot(
    game_id: String,
    name: String,
    file_data: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let backup_location = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.backup_location.clone()
    };

    tokio::task::spawn_blocking(move || {
        crate::snapshot::import_snapshot(&game_id, &name, &file_data, &backup_location)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}
