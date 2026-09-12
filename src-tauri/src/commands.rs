use crate::db_manager::DatabaseManager;
use crate::models::{BatchResult, BatchTaskItem, DatabaseStatus, HistoryItem, QueryResult};
use crate::storage::StorageManager;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn query_single(query: String, state: State<'_, Arc<DatabaseManager>>) -> QueryResult {
    state.query_single(&query)
}

#[tauri::command]
pub fn query_batch(queries: Vec<String>, state: State<'_, Arc<DatabaseManager>>) -> BatchResult {
    state.query_batch(queries)
}

#[tauri::command]
pub fn get_db_status(
    state: State<'_, Arc<DatabaseManager>>,
    storage: State<'_, Arc<StorageManager>>,
) -> DatabaseStatus {
    let mut status = state.get_status();
    status.sqlite_path = storage.db_path.clone();
    status
}

#[tauri::command]
pub fn update_db_paths(
    qqwry_path: Option<String>,
    ipdb_path: Option<String>,
    phone_path: Option<String>,
    state: State<'_, Arc<DatabaseManager>>,
    storage: State<'_, Arc<StorageManager>>,
) -> Result<DatabaseStatus, String> {
    if let Some(p) = &qqwry_path {
        if !p.trim().is_empty() {
            state.load_qqwry(p)?;
        }
    }
    if let Some(p) = &ipdb_path {
        if !p.trim().is_empty() {
            state.load_ipdb(p)?;
        }
    }
    if let Some(p) = &phone_path {
        if !p.trim().is_empty() {
            state.load_phone(p)?;
        }
    }
    let mut status = state.get_status();
    status.sqlite_path = storage.db_path.clone();
    Ok(status)
}

#[tauri::command]
pub async fn select_file(file_type: String) -> Option<String> {
    let mut dialog = rfd::AsyncFileDialog::new();
    if file_type == "qqwry" {
        dialog = dialog.add_filter("纯真 IP 库 (qqwry.dat)", &["dat"]);
    } else if file_type == "ipdb" {
        dialog = dialog.add_filter("IPIP.net 数据库 (*.ipdb)", &["ipdb"]);
    } else if file_type == "phone" {
        dialog = dialog.add_filter("手机号归属地库 (*.dat)", &["dat"]);
    }

    let file = dialog.pick_file().await;
    file.map(|h| h.path().to_string_lossy().to_string())
}

// ---------------- SQLite 历史记录与批次持久化 Commands ----------------

#[tauri::command]
pub fn get_single_history(storage: State<'_, Arc<StorageManager>>) -> Result<Vec<HistoryItem>, String> {
    storage.get_single_history()
}

#[tauri::command]
pub fn save_single_history(item: HistoryItem, storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.insert_single_history(item)
}

#[tauri::command]
pub fn delete_single_history(id: String, storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.delete_single_history(&id)
}

#[tauri::command]
pub fn clear_single_history(storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.clear_single_history()
}

#[tauri::command]
pub fn get_batch_tasks(storage: State<'_, Arc<StorageManager>>) -> Result<Vec<BatchTaskItem>, String> {
    storage.get_batch_tasks()
}

#[tauri::command]
pub fn save_batch_task(task: BatchTaskItem, storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.insert_batch_task(task)
}

#[tauri::command]
pub fn delete_batch_task(id: String, storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.delete_batch_task(&id)
}

#[tauri::command]
pub fn clear_batch_tasks(storage: State<'_, Arc<StorageManager>>) -> Result<(), String> {
    storage.clear_batch_tasks()
}
