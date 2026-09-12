use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub query: String,
    pub query_type: String, // "ip" | "phone" | "unknown"
    pub success: bool,
    pub country: String,
    pub province: String,
    pub city: String,
    pub isp: String,
    pub qqwry_country: Option<String>,
    pub qqwry_area: Option<String>,
    pub ipip_country: Option<String>,
    pub ipip_province: Option<String>,
    pub ipip_city: Option<String>,
    pub ipip_isp: Option<String>,
    pub details: HashMap<String, String>,
    pub error_message: Option<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub items: Vec<QueryResult>,
    pub total: usize,
    pub success_count: usize,
    pub failure_count: usize,
    pub duration_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStatus {
    pub qqwry_loaded: bool,
    pub qqwry_path: String,
    pub qqwry_version: String,
    pub qqwry_total_records: usize,
    pub ipdb_loaded: bool,
    pub ipdb_path: String,
    pub ipdb_languages: Vec<String>,
    pub ipdb_ipv4: bool,
    pub ipdb_ipv6: bool,
    pub phone_loaded: bool,
    pub phone_path: String,
    pub phone_version: String,
    pub phone_total_records: usize,
    pub sqlite_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: String,
    pub query: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub summary: String,
    pub isp: String,
    pub success: bool,
    pub timestamp: i64,
    pub raw_result: Option<QueryResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTaskItem {
    pub id: String,
    pub title: String,
    pub total: usize,
    pub success_count: usize,
    pub failure_count: usize,
    pub duration_ms: u128,
    pub timestamp: i64,
    pub items: Vec<QueryResult>,
}
