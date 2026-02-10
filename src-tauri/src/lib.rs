pub mod commands;
pub mod config;
pub mod game;
pub mod oauth_server;
pub mod process;
pub mod snapshot;

use commands::*;
use std::sync::Mutex;

pub fn run() {
    let config = config::Config::load().unwrap_or_default();
    let state = AppState {
        config: Mutex::new(config),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_backup_location,
            add_game,
            list_games,
            delete_game,
            update_game,
            create_snapshot,
            list_snapshots,
            restore_snapshot,
            delete_snapshot,
            rename_snapshot,
            verify_snapshot,
            is_process_running,
            select_folder,
            import_snapshot,
            oauth_server::start_oauth_server,
            oauth_server::wait_for_oauth_code,
            oauth_server::stop_oauth_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug)]
pub struct AppState {
    pub config: Mutex<config::Config>,
}
