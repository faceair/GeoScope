use crate::models::{BatchTaskItem, HistoryItem};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::fs;
use std::path::{Path, PathBuf};

const THIRTY_DAYS_SEC: i64 = 30 * 24 * 60 * 60;

pub struct StorageManager {
    conn: Mutex<Connection>,
    pub db_path: String,
}

impl StorageManager {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::resolve_db_path();
        if let Some(parent) = Path::new(&db_path).parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建数据库目录失败: {}", e))?;
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("打开 SQLite 数据库失败 ({}): {}", db_path, e))?;

        let mgr = Self {
            conn: Mutex::new(conn),
            db_path,
        };

        mgr.init_tables()?;
        Ok(mgr)
    }

    // 跨平台标准路径解析 (macOS: Application Support, Windows: AppData/Roaming, Linux: .local/share)
    fn resolve_db_path() -> String {
        let base_data_dir = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
        let app_dir = base_data_dir.join("com.geoscope.app");
        let _ = fs::create_dir_all(&app_dir);
        app_dir.join("geoscope.db").to_string_lossy().to_string()
    }

    fn init_tables(&self) -> Result<(), String> {
        let conn = self.conn.lock();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS single_history (
                id TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                query_type TEXT NOT NULL,
                summary TEXT NOT NULL,
                isp TEXT NOT NULL,
                success INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                raw_result TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_single_ts ON single_history(timestamp DESC);

            CREATE TABLE IF NOT EXISTS batch_tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                total INTEGER NOT NULL,
                success_count INTEGER NOT NULL,
                failure_count INTEGER NOT NULL,
                duration_ms INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                items_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_batch_ts ON batch_tasks(timestamp DESC);
            ",
        )
        .map_err(|e| format!("初始化 SQLite 表结构失败: {}", e))?;

        Ok(())
    }

    fn clean_expired(&self, conn: &Connection) {
        let cutoff = Utc::now().timestamp() - THIRTY_DAYS_SEC;
        let _ = conn.execute("DELETE FROM single_history WHERE timestamp < ?", params![cutoff]);
        let _ = conn.execute("DELETE FROM batch_tasks WHERE timestamp < ?", params![cutoff]);
    }

    // ---------------- 1. 单条查询接口 ----------------

    pub fn get_single_history(&self) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock();
        self.clean_expired(&conn);

        let mut stmt = conn
            .prepare(
                "SELECT id, query, query_type, summary, isp, success, timestamp, raw_result
                 FROM single_history
                 ORDER BY timestamp DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let query: String = row.get(1)?;
                let query_type: String = row.get(2)?;
                let summary: String = row.get(3)?;
                let isp: String = row.get(4)?;
                let success: bool = row.get(5)?;
                let timestamp: i64 = row.get(6)?;
                let raw_result_str: Option<String> = row.get(7)?;

                let raw_result = raw_result_str.and_then(|s| serde_json::from_str(&s).ok());

                Ok(HistoryItem {
                    id,
                    query,
                    type_: query_type,
                    summary,
                    isp,
                    success,
                    timestamp,
                    raw_result,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for item in rows {
            if let Ok(i) = item {
                list.push(i);
            }
        }
        Ok(list)
    }

    pub fn insert_single_history(&self, item: HistoryItem) -> Result<(), String> {
        let conn = self.conn.lock();
        self.clean_expired(&conn);

        let _ = conn.execute("DELETE FROM single_history WHERE query = ?", params![item.query]);

        let raw_json = item
            .raw_result
            .as_ref()
            .and_then(|r| serde_json::to_string(r).ok());

        conn.execute(
            "INSERT INTO single_history (id, query, query_type, summary, isp, success, timestamp, raw_result)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                item.id,
                item.query,
                item.type_,
                item.summary,
                item.isp,
                item.success,
                item.timestamp,
                raw_json
            ],
        )
        .map_err(|e| format!("写入单条历史失败: {}", e))?;

        Ok(())
    }

    pub fn delete_single_history(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM single_history WHERE id = ?", params![id])
            .map_err(|e| format!("删除单条历史失败: {}", e))?;
        Ok(())
    }

    pub fn clear_single_history(&self) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM single_history", [])
            .map_err(|e| format!("清空单条历史失败: {}", e))?;
        Ok(())
    }

    // ---------------- 2. 批量任务接口 ----------------

    pub fn get_batch_tasks(&self) -> Result<Vec<BatchTaskItem>, String> {
        let conn = self.conn.lock();
        self.clean_expired(&conn);

        let mut stmt = conn
            .prepare(
                "SELECT id, title, total, success_count, failure_count, duration_ms, timestamp, items_json
                 FROM batch_tasks
                 ORDER BY timestamp DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                let title: String = row.get(1)?;
                let total = row.get::<_, i64>(2)? as usize;
                let success_count = row.get::<_, i64>(3)? as usize;
                let failure_count = row.get::<_, i64>(4)? as usize;
                let duration_ms = row.get::<_, i64>(5)? as u128;
                let timestamp: i64 = row.get(6)?;
                let items_json: String = row.get(7)?;

                let items = serde_json::from_str(&items_json).unwrap_or_default();

                Ok(BatchTaskItem {
                    id,
                    title,
                    total,
                    success_count,
                    failure_count,
                    duration_ms,
                    timestamp,
                    items,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for item in rows {
            if let Ok(i) = item {
                list.push(i);
            }
        }
        Ok(list)
    }

    pub fn insert_batch_task(&self, task: BatchTaskItem) -> Result<(), String> {
        let conn = self.conn.lock();
        self.clean_expired(&conn);

        let items_json =
            serde_json::to_string(&task.items).map_err(|e| format!("序列化批量数据失败: {}", e))?;

        conn.execute(
            "INSERT INTO batch_tasks (id, title, total, success_count, failure_count, duration_ms, timestamp, items_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                task.id,
                task.title,
                task.total as i64,
                task.success_count as i64,
                task.failure_count as i64,
                task.duration_ms as i64,
                task.timestamp,
                items_json
            ],
        )
        .map_err(|e| format!("写入批量任务失败: {}", e))?;

        Ok(())
    }

    pub fn delete_batch_task(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM batch_tasks WHERE id = ?", params![id])
            .map_err(|e| format!("删除批量任务失败: {}", e))?;
        Ok(())
    }

    pub fn clear_batch_tasks(&self) -> Result<(), String> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM batch_tasks", [])
            .map_err(|e| format!("清空批量任务失败: {}", e))?;
        Ok(())
    }
}
