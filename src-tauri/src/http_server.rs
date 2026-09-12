use crate::db_manager::DatabaseManager;
use crate::storage::StorageManager;
use serde_json::{json, Value};
use std::sync::Arc;
use std::thread;
use tiny_http::{Header, Method, Response, Server};

pub struct HttpServer {
    pub port: u16,
}

impl HttpServer {
    pub fn start(
        db_mgr: Arc<DatabaseManager>,
        storage_mgr: Arc<StorageManager>,
    ) -> Result<Self, String> {
        let mut port = 17890;
        let mut server = None;

        for p in 17890..=17895 {
            if let Ok(s) = Server::http(format!("127.0.0.1:{}", p)) {
                server = Some(s);
                port = p;
                break;
            }
        }

        let server = server.ok_or_else(|| "无法绑定本地端口 17890-17895".to_string())?;

        let db_mgr_clone = db_mgr.clone();
        let storage_mgr_clone = storage_mgr.clone();

        thread::spawn(move || {
            let cors_header: Header = "Access-Control-Allow-Origin: *".parse().unwrap();
            let cors_methods: Header = "Access-Control-Allow-Methods: GET, POST, OPTIONS".parse().unwrap();
            let cors_headers: Header = "Access-Control-Allow-Headers: Content-Type".parse().unwrap();
            let content_type_json: Header = "Content-Type: application/json; charset=utf-8".parse().unwrap();
            let content_type_md: Header = "Content-Type: text/markdown; charset=utf-8".parse().unwrap();

            for mut request in server.incoming_requests() {
                if request.method() == &Method::Options {
                    let res = Response::empty(204)
                        .with_header(cors_header.clone())
                        .with_header(cors_methods.clone())
                        .with_header(cors_headers.clone());
                    let _ = request.respond(res);
                    continue;
                }

                let url = request.url().to_string();
                let path = url.split('?').next().unwrap_or("");

                // 1. Skill 技能文件分发: GET /skill.md 或 GET /skill
                if request.method() == &Method::Get && (path == "/skill.md" || path == "/skill" || path == "/SKILL.md") {
                    let skill_content = format!(
r#"---
name: geoscope
description: 本地离线高精度查询 IP (IPv4/IPv6) 与国内手机号物理归属地、运营商及具体高校/机构/机房详细备注。
---
# GeoScope 本地归属地查询技能

## 适用场景
当需要查询 IP 地址归属、国内 11 位手机号段归属、运营商属性或校园网/数据中心机构详细注记时调用。
数据源自本地纯真 CZ88 (机构细分) + IPIP.net (标准经纬度/行政代码) + 手机号段库，100% 本地离线极速运行。

## 接口地址 (本地守护进程)
基础地址: http://127.0.0.1:{}/

### 1. 单条查询 (IP 或 手机号)
- 命令: curl -s "http://127.0.0.1:{}/api/query?q=<IP或手机号>"
- 示例: curl -s "http://127.0.0.1:{}/api/query?q=162.105.10.100"

### 2. 批量并发查询
- 命令: curl -s -X POST "http://127.0.0.1:{}/api/batch" -H "Content-Type: application/json" -d '{{"queries": ["180.101.50.242", "13800138000"]}}'

### 3. 返回字段
- query: 查询目标
- province / city: 省份与地级市
- isp: 运营商 / 机构实体 (如: 教育网/北京大学)
- qqwry_area: 纯真详细备注
- details: 包含 latitude, longitude, timezone, china_admin_code 等
"#,
                        port, port, port, port
                    );

                    let res = Response::from_data(skill_content.into_bytes())
                        .with_status_code(200)
                        .with_header(content_type_md.clone())
                        .with_header(cors_header.clone());
                    let _ = request.respond(res);
                    continue;
                }

                // 2. 本地 REST API 路由
                let (status_code, json_body) = match (request.method(), path) {
                    (&Method::Get, "/api/status") => {
                        let mut status = db_mgr_clone.get_status();
                        status.sqlite_path = storage_mgr_clone.db_path.clone();
                        (200, json!({ "success": true, "data": status, "skill_url": format!("http://127.0.0.1:{}/skill.md", port) }))
                    }

                    (&Method::Get, "/api/query") => {
                        let query_str = url.split('?').nth(1).unwrap_or("");
                        let target = query_str
                            .split('&')
                            .find(|pair| pair.starts_with("q=") || pair.starts_with("target="))
                            .and_then(|pair| pair.split('=').nth(1))
                            .unwrap_or("")
                            .trim();

                        if target.is_empty() {
                            (400, json!({ "success": false, "error": "缺少参数 q 或 target" }))
                        } else {
                            let res = db_mgr_clone.query_single(target);
                            let _ = storage_mgr_clone.insert_single_history(crate::models::HistoryItem {
                                id: format!("{}_{}", chrono::Utc::now().timestamp_millis(), target),
                                query: res.query.clone(),
                                type_: res.query_type.clone(),
                                summary: format!("{} {}", res.province, res.city).trim().to_string(),
                                isp: res.isp.clone(),
                                success: res.success,
                                timestamp: res.timestamp,
                                raw_result: Some(res.clone()),
                            });
                            (200, json!({ "success": true, "data": res }))
                        }
                    }

                    (&Method::Post, "/api/query") => {
                        let mut body_str = String::new();
                        let _ = request.as_reader().read_to_string(&mut body_str);
                        let parsed: Result<Value, _> = serde_json::from_str(&body_str);

                        match parsed {
                            Ok(val) => {
                                let target = val["query"]
                                    .as_str()
                                    .or_else(|| val["target"].as_str())
                                    .unwrap_or("")
                                    .trim();

                                if target.is_empty() {
                                    (400, json!({ "success": false, "error": "请求体缺少 query 字段" }))
                                } else {
                                    let res = db_mgr_clone.query_single(target);
                                    let _ = storage_mgr_clone.insert_single_history(crate::models::HistoryItem {
                                        id: format!("{}_{}", chrono::Utc::now().timestamp_millis(), target),
                                        query: res.query.clone(),
                                        type_: res.query_type.clone(),
                                        summary: format!("{} {}", res.province, res.city).trim().to_string(),
                                        isp: res.isp.clone(),
                                        success: res.success,
                                        timestamp: res.timestamp,
                                        raw_result: Some(res.clone()),
                                    });
                                    (200, json!({ "success": true, "data": res }))
                                }
                            }
                            Err(_) => (400, json!({ "success": false, "error": "无效的 JSON 请求体" })),
                        }
                    }

                    (&Method::Post, "/api/batch") => {
                        let mut body_str = String::new();
                        let _ = request.as_reader().read_to_string(&mut body_str);
                        let parsed: Result<Value, _> = serde_json::from_str(&body_str);

                        match parsed {
                            Ok(val) => {
                                let queries = val["queries"].as_array();
                                if let Some(arr) = queries {
                                    let list: Vec<String> = arr
                                        .iter()
                                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                                        .collect();

                                    let res = db_mgr_clone.query_batch(list);
                                    (200, json!({ "success": true, "data": res }))
                                } else {
                                    (400, json!({ "success": false, "error": "请求体缺少 queries 字符串数组" }))
                                }
                            }
                            Err(_) => (400, json!({ "success": false, "error": "无效的 JSON 请求体" })),
                        }
                    }

                    (&Method::Get, "/api/history") => {
                        match storage_mgr_clone.get_single_history() {
                            Ok(items) => (200, json!({ "success": true, "data": items })),
                            Err(e) => (500, json!({ "success": false, "error": e })),
                        }
                    }

                    _ => (404, json!({ "success": false, "error": "未找到请求接口" })),
                };

                let body_bytes = json_body.to_string().into_bytes();
                let res = Response::from_data(body_bytes)
                    .with_status_code(status_code)
                    .with_header(content_type_json.clone())
                    .with_header(cors_header.clone())
                    .with_header(cors_methods.clone())
                    .with_header(cors_headers.clone());

                let _ = request.respond(res);
            }
        });

        Ok(Self { port })
    }
}
