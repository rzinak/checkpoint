use crate::game::Game;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const CONFIG_DIR: &str = ".config/checkpoint";
const CONFIG_FILE: &str = "config.json";

fn get_default_backup_location() -> String {
    let home_dir = dirs::home_dir();

    let valid_home = home_dir.filter(|path| {
        let path_str = path.to_string_lossy();
        !path_str.ends_with(":\\") && !path_str.ends_with(":/") && path_str.len() > 3
    });

    match valid_home {
        Some(home) => home.join("checkpoint").to_string_lossy().to_string(),
        None => {
            if cfg!(target_os = "windows") {
                std::env::var("USERPROFILE")
                    .map(|p| {
                        PathBuf::from(p)
                            .join("checkpoint")
                            .to_string_lossy()
                            .to_string()
                    })
                    .unwrap_or_else(|_| "C:\\Users\\Default\\checkpoint".to_string())
            } else {
                std::env::var("HOME")
                    .map(|p| {
                        PathBuf::from(p)
                            .join("checkpoint")
                            .to_string_lossy()
                            .to_string()
                    })
                    .unwrap_or_else(|_| "/tmp/checkpoint".to_string())
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub games: Vec<Game>,
    pub backup_location: String,
}

impl Default for Config {
    fn default() -> Self {
        let backup_location = get_default_backup_location();

        Self {
            games: Vec::new(),
            backup_location,
        }
    }
}

impl Config {
    pub fn load() -> Result<Self, String> {
        let config_path = Self::config_path()?;

        if !config_path.exists() {
            let config = Self::default();
            config.save()?;
            return Ok(config);
        }

        let contents = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;

        let config: Config = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse config: {}", e))?;

        Ok(config)
    }

    pub fn save(&self) -> Result<(), String> {
        let config_path = Self::config_path()?;

        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let contents = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        std::fs::write(&config_path, contents)
            .map_err(|e| format!("Failed to write config: {}", e))?;

        let backup_path = PathBuf::from(&self.backup_location);
        if !backup_path.exists() {
            std::fs::create_dir_all(&backup_path)
                .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        }

        Ok(())
    }

    fn config_path() -> Result<PathBuf, String> {
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;

        Ok(home_dir.join(CONFIG_DIR).join(CONFIG_FILE))
    }
}
