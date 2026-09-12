use crate::models::{BatchResult, DatabaseStatus, QueryResult};
use crate::phone::PhoneDatabase;
use crate::qqwry::QqWryDatabase;
use chrono::Utc;
use ipdb::Reader as IpdbReader;
use parking_lot::RwLock;
use rayon::prelude::*;
use std::collections::HashMap;
use std::net::IpAddr;
use std::path::PathBuf;
use std::str::FromStr;
use std::time::Instant;

pub struct DatabaseManager {
    qqwry: RwLock<Option<QqWryDatabase>>,
    qqwry_path: RwLock<String>,
    ipdb: RwLock<Option<IpdbReader>>,
    ipdb_path: RwLock<String>,
    phone_db: RwLock<Option<PhoneDatabase>>,
    phone_path: RwLock<String>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        let mgr = Self {
            qqwry: RwLock::new(None),
            qqwry_path: RwLock::new(String::new()),
            ipdb: RwLock::new(None),
            ipdb_path: RwLock::new(String::new()),
            phone_db: RwLock::new(None),
            phone_path: RwLock::new(String::new()),
        };

        mgr.auto_discover_and_load();
        mgr
    }

    pub fn auto_discover_and_load(&self) {
        let mut search_dirs = Vec::new();

        // 1. 项目内置资源目录 (优先加载项目自带数据)
        search_dirs.push(PathBuf::from("./data"));
        search_dirs.push(PathBuf::from("./src-tauri/data"));
        search_dirs.push(PathBuf::from("."));

        // 2. 编译后的二进制同级与 App Bundle Resources 目录
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                search_dirs.push(exe_dir.to_path_buf());
                search_dirs.push(exe_dir.join("data"));
                search_dirs.push(exe_dir.join("../Resources/data"));
                search_dirs.push(exe_dir.join("../Resources"));
            }
        }

        // 3. 系统下载目录后备
        if let Some(d) = dirs::download_dir() {
            search_dirs.push(d);
        }
        if let Some(h) = dirs::home_dir() {
            search_dirs.push(h.join("Downloads"));
        }

        // 自动发现并载入纯真 IP 库
        for dir in &search_dirs {
            let path = dir.join("qqwry.dat");
            if path.exists() {
                if let Ok(_) = self.load_qqwry(&path.to_string_lossy()) {
                    break;
                }
            }
        }

        // 自动发现并载入 IPIP 库
        for dir in &search_dirs {
            let path = dir.join("ipip_china_cn.ipdb");
            if path.exists() {
                if let Ok(_) = self.load_ipdb(&path.to_string_lossy()) {
                    break;
                }
            }
            let path2 = dir.join("city.ipv4.ipdb");
            if path2.exists() {
                if let Ok(_) = self.load_ipdb(&path2.to_string_lossy()) {
                    break;
                }
            }
        }

        // 自动发现并载入手机号库
        for dir in &search_dirs {
            let path = dir.join("phone.dat");
            if path.exists() {
                if let Ok(_) = self.load_phone(&path.to_string_lossy()) {
                    break;
                }
            }
        }
    }

    pub fn load_qqwry(&self, path_str: &str) -> Result<(), String> {
        let path = PathBuf::from(path_str);
        if !path.exists() {
            return Err(format!("纯真 IP 库文件不存在: {}", path_str));
        }

        match QqWryDatabase::open(&path) {
            Ok(db) => {
                *self.qqwry.write() = Some(db);
                *self.qqwry_path.write() = path_str.to_string();
                Ok(())
            }
            Err(e) => Err(format!("加载纯真 IP 库失败: {}", e)),
        }
    }

    pub fn load_ipdb(&self, path_str: &str) -> Result<(), String> {
        let path = PathBuf::from(path_str);
        if !path.exists() {
            return Err(format!("IPDB 文件不存在: {}", path_str));
        }

        match IpdbReader::open_file(&path) {
            Ok(reader) => {
                *self.ipdb.write() = Some(reader);
                *self.ipdb_path.write() = path_str.to_string();
                Ok(())
            }
            Err(e) => Err(format!("加载 IPDB 失败: {}", e)),
        }
    }

    pub fn load_phone(&self, path_str: &str) -> Result<(), String> {
        let path = PathBuf::from(path_str);
        if !path.exists() {
            return Err(format!("phone.dat 文件不存在: {}", path_str));
        }

        match PhoneDatabase::open(&path) {
            Ok(db) => {
                *self.phone_db.write() = Some(db);
                *self.phone_path.write() = path_str.to_string();
                Ok(())
            }
            Err(e) => Err(format!("加载 phone.dat 失败: {}", e)),
        }
    }

    pub fn get_status(&self) -> DatabaseStatus {
        let qqwry_guard = self.qqwry.read();
        let ipdb_guard = self.ipdb.read();
        let phone_guard = self.phone_db.read();

        let (qqwry_loaded, qqwry_version, qqwry_total_records) = match &*qqwry_guard {
            Some(db) => (true, db.version.clone(), db.total_records),
            None => (false, String::new(), 0),
        };

        let (ipdb_loaded, ipdb_languages, ipdb_ipv4, ipdb_ipv6) = match &*ipdb_guard {
            Some(reader) => (
                true,
                vec!["CN".to_string()],
                reader.is_ipv4(),
                reader.is_ipv6(),
            ),
            None => (false, vec![], false, false),
        };

        let (phone_loaded, phone_version, phone_total_records) = match &*phone_guard {
            Some(db) => (true, db.version.clone(), db.total_records),
            None => (false, String::new(), 0),
        };

        DatabaseStatus {
            qqwry_loaded,
            qqwry_path: self.qqwry_path.read().clone(),
            qqwry_version,
            qqwry_total_records,
            ipdb_loaded,
            ipdb_path: self.ipdb_path.read().clone(),
            ipdb_languages,
            ipdb_ipv4,
            ipdb_ipv6,
            phone_loaded,
            phone_path: self.phone_path.read().clone(),
            phone_version,
            phone_total_records,
            sqlite_path: String::new(),
        }
    }

    pub fn query_single(&self, raw_input: &str) -> QueryResult {
        let query = raw_input.trim().to_string();
        let timestamp = Utc::now().timestamp();

        if query.is_empty() {
            return QueryResult {
                query,
                query_type: "unknown".to_string(),
                success: false,
                country: String::new(),
                province: String::new(),
                city: String::new(),
                isp: String::new(),
                qqwry_country: None,
                qqwry_area: None,
                ipip_country: None,
                ipip_province: None,
                ipip_city: None,
                ipip_isp: None,
                details: HashMap::new(),
                error_message: Some("输入不能为空".to_string()),
                timestamp,
            };
        }

        if let Ok(ip_addr) = IpAddr::from_str(&query) {
            return self.query_ip_internal(&query, &ip_addr, timestamp);
        }

        let clean_phone: String = query.chars().filter(|c| c.is_ascii_digit()).collect();
        let phone_candidate = if clean_phone.starts_with("86") && clean_phone.len() == 13 {
            &clean_phone[2..]
        } else {
            &clean_phone
        };

        if phone_candidate.len() >= 7 && phone_candidate.len() <= 11 && phone_candidate.starts_with('1') {
            return self.query_phone_internal(&query, phone_candidate, timestamp);
        }

        if query.contains('.') || query.contains(':') {
            if let Ok(ip_addr) = IpAddr::from_str(&query) {
                return self.query_ip_internal(&query, &ip_addr, timestamp);
            }
        }

        if clean_phone.len() >= 7 {
            return self.query_phone_internal(&query, &clean_phone, timestamp);
        }

        QueryResult {
            query,
            query_type: "unknown".to_string(),
            success: false,
            country: String::new(),
            province: String::new(),
            city: String::new(),
            isp: String::new(),
            qqwry_country: None,
            qqwry_area: None,
            ipip_country: None,
            ipip_province: None,
            ipip_city: None,
            ipip_isp: None,
            details: HashMap::new(),
            error_message: Some("无法识别为有效的 IP 地址或手机号".to_string()),
            timestamp,
        }
    }

    fn query_ip_internal(&self, original_query: &str, ip: &IpAddr, timestamp: i64) -> QueryResult {
        let mut details = HashMap::new();

        match ip {
            IpAddr::V4(v4) => {
                details.insert("ip_version".to_string(), "IPv4".to_string());
                let scope = if v4.is_loopback() {
                    "环回地址 (Loopback)"
                } else if v4.is_private() {
                    "内网私有地址 (Private)"
                } else if v4.is_link_local() {
                    "链路本地地址 (Link-Local)"
                } else if v4.is_multicast() {
                    "组播地址 (Multicast)"
                } else if v4.is_broadcast() {
                    "广播地址 (Broadcast)"
                } else {
                    "公网地址 (Public Internet)"
                };
                details.insert("network_scope".to_string(), scope.to_string());
            }
            IpAddr::V6(v6) => {
                details.insert("ip_version".to_string(), "IPv6".to_string());
                let scope = if v6.is_loopback() {
                    "环回地址 (Loopback)"
                } else if v6.is_multicast() {
                    "组播地址 (Multicast)"
                } else {
                    "全局单播/公网地址 (Global Unicast)"
                };
                details.insert("network_scope".to_string(), scope.to_string());
            }
        }

        let mut qqwry_res: Option<(String, String)> = None;
        if let IpAddr::V4(v4) = ip {
            let qqwry_guard = self.qqwry.read();
            if let Some(db) = &*qqwry_guard {
                if let Some(rec) = db.lookup_v4(*v4) {
                    qqwry_res = Some((rec.country, rec.area));
                }
            }
        }

        let ip_str = ip.to_string();
        let ipdb_guard = self.ipdb.read();
        let mut ipip_data = None;

        if let Some(reader) = &*ipdb_guard {
            if let Ok(info) = reader.find_city_info(&ip_str, "CN") {
                if !info.latitude.is_empty() {
                    details.insert("latitude".to_string(), info.latitude.to_string());
                }
                if !info.longitude.is_empty() {
                    details.insert("longitude".to_string(), info.longitude.to_string());
                }
                if !info.timezone.is_empty() {
                    details.insert("timezone".to_string(), info.timezone.to_string());
                }
                if !info.utcoffset.is_empty() {
                    details.insert("utc_offset".to_string(), info.utcoffset.to_string());
                }
                if !info.china_admin_code.is_empty() {
                    details.insert("china_admin_code".to_string(), info.china_admin_code.to_string());
                }
                if !info.idd_code.is_empty() {
                    details.insert("idd_code".to_string(), info.idd_code.to_string());
                }
                if !info.country_code.is_empty() {
                    details.insert("country_code".to_string(), info.country_code.to_string());
                }
                if !info.continent_code.is_empty() {
                    details.insert("continent_code".to_string(), info.continent_code.to_string());
                }
                if !info.owner_domain.is_empty() {
                    details.insert("owner_domain".to_string(), info.owner_domain.to_string());
                }
                if !info.idc.is_empty() {
                    details.insert("idc".to_string(), info.idc.to_string());
                }

                ipip_data = Some((
                    info.country_name.to_string(),
                    info.region_name.to_string(),
                    info.city_name.to_string(),
                    info.isp_domain.to_string(),
                ));
            }
        }

        if qqwry_res.is_none() && ipip_data.is_none() {
            return QueryResult {
                query: original_query.to_string(),
                query_type: "ip".to_string(),
                success: false,
                country: String::new(),
                province: String::new(),
                city: String::new(),
                isp: String::new(),
                qqwry_country: None,
                qqwry_area: None,
                ipip_country: None,
                ipip_province: None,
                ipip_city: None,
                ipip_isp: None,
                details,
                error_message: Some("未能匹配到该 IP 的归属地信息".to_string()),
                timestamp,
            };
        }

        let mut final_country = String::new();
        let mut final_province = String::new();
        let mut final_city = String::new();
        let mut final_isp = String::new();

        let (qqwry_c, qqwry_a) = match &qqwry_res {
            Some((c, a)) => (Some(c.clone()), Some(a.clone())),
            None => (None, None),
        };

        if let Some((c, a)) = &qqwry_res {
            if c.contains("–") || c.contains("-") {
                let parts: Vec<&str> = c.split(|ch| ch == '–' || ch == '-').collect();
                if parts.len() >= 1 { final_country = parts[0].trim().to_string(); }
                if parts.len() >= 2 { final_province = parts[1].trim().to_string(); }
                if parts.len() >= 3 { final_city = parts[2].trim().to_string(); }
            } else {
                final_country = "中国".to_string();
                final_province = c.clone();
            }

            final_isp = a.clone();
        }

        let (ipip_country, ipip_province, ipip_city, ipip_isp) = match &ipip_data {
            Some((c, p, city_name, isp)) => {
                if final_country.is_empty() { final_country = c.clone(); }
                if final_province.is_empty() { final_province = p.clone(); }
                if final_city.is_empty() { final_city = city_name.clone(); }
                if final_isp.is_empty() { final_isp = isp.clone(); }
                (Some(c.clone()), Some(p.clone()), Some(city_name.clone()), Some(isp.clone()))
            }
            None => (None, None, None, None),
        };

        QueryResult {
            query: original_query.to_string(),
            query_type: "ip".to_string(),
            success: true,
            country: final_country,
            province: final_province,
            city: final_city,
            isp: final_isp,
            qqwry_country: qqwry_c,
            qqwry_area: qqwry_a,
            ipip_country,
            ipip_province,
            ipip_city,
            ipip_isp,
            details,
            error_message: None,
            timestamp,
        }
    }

    fn query_phone_internal(&self, original_query: &str, clean_phone: &str, timestamp: i64) -> QueryResult {
        let phone_guard = self.phone_db.read();
        let db = match &*phone_guard {
            Some(d) => d,
            None => {
                return QueryResult {
                    query: original_query.to_string(),
                    query_type: "phone".to_string(),
                    success: false,
                    country: String::new(),
                    province: String::new(),
                    city: String::new(),
                    isp: String::new(),
                    qqwry_country: None,
                    qqwry_area: None,
                    ipip_country: None,
                    ipip_province: None,
                    ipip_city: None,
                    ipip_isp: None,
                    details: HashMap::new(),
                    error_message: Some("手机归属地数据库未载入，请在设置中配置 phone.dat 文件路径".to_string()),
                    timestamp,
                }
            }
        };

        match db.lookup(clean_phone) {
            Some(record) => {
                let mut details = HashMap::new();
                details.insert("zip_code".to_string(), record.zip_code);
                details.insert("area_code".to_string(), record.area_code);
                details.insert("prefix".to_string(), record.prefix.to_string());
                details.insert("card_type".to_string(), record.card_type.to_string());

                QueryResult {
                    query: original_query.to_string(),
                    query_type: "phone".to_string(),
                    success: true,
                    country: "中国".to_string(),
                    province: record.province,
                    city: record.city,
                    isp: record.isp,
                    qqwry_country: None,
                    qqwry_area: None,
                    ipip_country: None,
                    ipip_province: None,
                    ipip_city: None,
                    ipip_isp: None,
                    details,
                    error_message: None,
                    timestamp,
                }
            }
            None => QueryResult {
                query: original_query.to_string(),
                query_type: "phone".to_string(),
                success: false,
                country: String::new(),
                province: String::new(),
                city: String::new(),
                isp: String::new(),
                qqwry_country: None,
                qqwry_area: None,
                ipip_country: None,
                ipip_province: None,
                ipip_city: None,
                ipip_isp: None,
                details: HashMap::new(),
                error_message: Some("未找到该号段的归属地数据".to_string()),
                timestamp,
            },
        }
    }

    pub fn query_batch(&self, queries: Vec<String>) -> BatchResult {
        let start = Instant::now();
        let total = queries.len();

        let items: Vec<QueryResult> = queries
            .into_par_iter()
            .map(|q| self.query_single(&q))
            .collect();

        let success_count = items.iter().filter(|i| i.success).count();
        let failure_count = total - success_count;
        let duration_ms = start.elapsed().as_millis();

        BatchResult {
            items,
            total,
            success_count,
            failure_count,
            duration_ms,
        }
    }
}
