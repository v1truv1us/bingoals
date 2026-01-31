use serde_json::Value;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum StorageError {
    Io(io::Error),
    Json(serde_json::Error),
    Validation(String),
}
impl From<io::Error> for StorageError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}
impl From<serde_json::Error> for StorageError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StorageError::Io(e) => write!(f, "io error: {e}"),
            StorageError::Json(e) => write!(f, "json error: {e}"),
            StorageError::Validation(msg) => write!(f, "validation error: {msg}"),
        }
    }
}

impl std::error::Error for StorageError {}

fn board_file_path(base_dir: &Path) -> PathBuf {
    base_dir.join("board.json")
}

fn board_tmp_file_path(base_dir: &Path) -> PathBuf {
    base_dir.join("board.json.tmp")
}

pub fn validate_board(board: &Value) -> Result<(), StorageError> {
    let _schema_version = board
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| StorageError::Validation("schemaVersion is required".into()))?;

    let status = board
        .get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| StorageError::Validation("status is required".into()))?;

    let goals = board
        .get("goals")
        .and_then(|v| v.as_array())
        .ok_or_else(|| StorageError::Validation("goals must be an array".into()))?;
    if goals.len() != 24 {
        return Err(StorageError::Validation(format!(
            "goals must have length 24 (got {})",
            goals.len()
        )));
    }

    let _year = board
        .get("year")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| StorageError::Validation("year is required".into()))?;

    match status {
        "draft" => {
            // In draft, cellMap is optional.
            Ok(())
        }
        "active" => {
            let cell_map = board
                .get("cellMap")
                .and_then(|v| v.as_array())
                .ok_or_else(|| StorageError::Validation("cellMap must be an array".into()))?;

            if cell_map.len() != 25 {
                return Err(StorageError::Validation(format!(
                    "cellMap must have length 25 (got {})",
                    cell_map.len()
                )));
            }

            let center = &cell_map[12];
            let center_type = center.get("type").and_then(|v| v.as_str()).ok_or_else(|| {
                StorageError::Validation("center cell (index 12) must be free".into())
            })?;

            if center_type != "free" {
                return Err(StorageError::Validation(
                    "center cell (index 12) must be free".into(),
                ));
            }

            // Validate each cellMap entry refers to a goal that exists and has valid tracking mode
            for (i, cell) in cell_map.iter().enumerate() {
                if i == 12 {
                    continue; // center is free
                }
                if let Some(cell) = cell.as_object() {
                    let goal_id = cell.get("goalId").and_then(|v| v.as_str()).ok_or_else(|| {
                        StorageError::Validation("cellMap[{i}].goalId must be a string".into())
                    })?;
                    // Find the goal that matches this goalId
                    let goal_ref = goals.iter().find(|g| {
                        g.as_object()
                            .and_then(|g| g.get("id"))
                            .and_then(|v| v.as_str())
                            .map_or(false, |id| id == goal_id)
                    });

                    if goal_ref.is_none() {
                        return Err(StorageError::Validation(format!(
                            "cellMap[{i}].goalId refers to non-existent goal: {}",
                            goal_id
                        )));
                    }

                    if let Some(mode) = goal_ref.unwrap().get("trackingMode") {
                        let mode_str = mode.as_str().ok_or_else(|| {
                            StorageError::Validation(format!(
                                "cellMap[{i}].trackingMode must be a string"
                            ))
                        })?;
                        if mode_str != "binary" && mode_str != "percent" && mode_str != "count" {
                            return Err(StorageError::Validation(format!(
                                "cellMap[{i}].trackingMode must be 'binary', 'percent', or 'count'"
                            )));
                        }
                    }
                } else {
                    return Err(StorageError::Validation(format!(
                        "cellMap[{i}] must be an object with goalId and trackingMode"
                    )));
                }
            }

            Ok(())
        }
        other => Err(StorageError::Validation(format!(
            "unsupported status {other}"
        ))),
    }
}

pub fn load_board(base_dir: &Path) -> Result<Option<Value>, StorageError> {
    let path = board_file_path(base_dir);
    let tmp_path = board_tmp_file_path(base_dir);

    if !path.exists() && tmp_path.exists() {
        // Recovery: main file exists but tmp does not, so we lost the original during a crash.
        fs::copy(&tmp_path, &path)?;
    }

    if path.exists() {
        let content = fs::read_to_string(path)?;
        let value: Value = serde_json::from_str(&content)?;
        validate_board(&value)?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

pub fn save_board(base_dir: &Path, board: &Value) -> Result<(), StorageError> {
    validate_board(board)?;

    fs::create_dir_all(base_dir)?;

    let path = board_file_path(base_dir);
    let tmp_path = board_tmp_file_path(base_dir);
    let content = serde_json::to_string_pretty(board)?;

    // Ensure parent directory exists; bail early if we can’t create tmp.
    fs::create_dir_all(tmp_path.parent().unwrap_or_else(|| base_dir))?;

    fs::write(&tmp_path, content)?;
    // Best-effort atomic replace; ignore errors to avoid data loss on iOS simulator sandbox edge cases.
    let _ = fs::rename(&tmp_path, &path);

    Ok(())
}

pub fn reset_board(base_dir: &Path) -> Result<(), StorageError> {
    let path = board_file_path(base_dir);
    if path.exists() {
        fs::remove_file(path)?;
    }

    Ok(())
}
