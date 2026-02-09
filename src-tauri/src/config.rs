use crate::game::Game;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const CONFIG_DIR: &str = ".config/checkpoint";
const CONFIG_FILE: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub games: Vec<Game>,
    pub backup_location: String,
}

impl Default for Config {
    fn default() -> Self {
        let home_dir = dirs::home_dir().unwrap_or_else(|| PathBuf::from("~"));
        let backup_location = home_dir.join("checkpoint").to_string_lossy().to_string();

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
