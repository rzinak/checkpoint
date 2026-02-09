use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub name: String,
    pub save_location: String,
    pub exe_name: Option<String>,
    pub cover_image: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl Game {
    pub fn new(
        name: String,
        save_location: String,
        exe_name: Option<String>,
        cover_image: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            save_location,
            exe_name,
            cover_image,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AddGameRequest {
    pub name: String,
    pub save_location: String,
    pub exe_name: Option<String>,
    pub cover_image: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGameRequest {
    pub game_id: String,
    pub name: Option<String>,
    pub save_location: Option<String>,
    pub exe_name: Option<String>,
    pub cover_image: Option<String>,
}
