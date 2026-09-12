use encoding_rs::GBK;
use std::fs::File;
use std::io::Read;
use std::net::Ipv4Addr;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QqWryRecord {
    pub ip: String,
    pub country: String, // 纯真国家/主行政区 (例如: 江苏省南京市)
    pub area: String,    // 纯真详细备注 (例如: 南京邮电大学仙林校区 / 电信)
}

pub struct QqWryDatabase {
    pub path: String,
    pub total_records: usize,
    pub first_index_offset: usize,
    pub last_index_offset: usize,
    pub version: String,
    data: Vec<u8>,
}

impl QqWryDatabase {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let mut file = File::open(&path).map_err(|e| format!("无法打开纯真数据库: {}", e))?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)
            .map_err(|e| format!("读取纯真数据库失败: {}", e))?;

        if data.len() < 8 {
            return Err("纯真数据库文件损坏: 文件过小".to_string());
        }

        let first_index_offset =
            u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;
        let last_index_offset =
            u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;

        if first_index_offset > data.len() || last_index_offset > data.len() {
            return Err("纯真数据库索引偏移越界".to_string());
        }

        let total_records = (last_index_offset - first_index_offset) / 7 + 1;

        let mut db = Self {
            path: path_str,
            total_records,
            first_index_offset,
            last_index_offset,
            version: String::new(),
            data,
        };

        if let Some(ver_record) = db.lookup_v4(Ipv4Addr::new(255, 255, 255, 255)) {
            db.version = format!("{} {}", ver_record.country, ver_record.area).trim().to_string();
        }

        Ok(db)
    }

    fn read_u24(&self, offset: usize) -> Option<usize> {
        if offset + 3 > self.data.len() {
            return None;
        }
        Some(
            self.data[offset] as usize
                | ((self.data[offset + 1] as usize) << 8)
                | ((self.data[offset + 2] as usize) << 16),
        )
    }

    fn read_string(&self, offset: usize) -> (String, usize) {
        let mut end = offset;
        while end < self.data.len() && self.data[end] != 0 {
            end += 1;
        }
        let raw = &self.data[offset..end];
        let (cow, _, _) = GBK.decode(raw);
        let s = cow.trim().to_string();
        let next_offset = if end < self.data.len() { end + 1 } else { end };
        (s, next_offset)
    }

    fn read_area(&self, offset: usize) -> String {
        if offset >= self.data.len() {
            return String::new();
        }
        let mode = self.data[offset];
        if mode == 1 || mode == 2 {
            if let Some(new_offset) = self.read_u24(offset + 1) {
                let (str_val, _) = self.read_string(new_offset);
                return str_val;
            }
            String::new()
        } else {
            let (str_val, _) = self.read_string(offset);
            str_val
        }
    }

    pub fn lookup_v4(&self, ip: Ipv4Addr) -> Option<QqWryRecord> {
        let ip_num = u32::from_be_bytes(ip.octets());
        if self.total_records == 0 {
            return None;
        }

        let mut low = 0;
        let mut high = self.total_records - 1;
        let mut found_record_offset = 0;

        while low <= high {
            let mid = (low + high) / 2;
            let idx_offset = self.first_index_offset + mid * 7;
            if idx_offset + 7 > self.data.len() {
                break;
            }

            let start_ip = u32::from_le_bytes([
                self.data[idx_offset],
                self.data[idx_offset + 1],
                self.data[idx_offset + 2],
                self.data[idx_offset + 3],
            ]);

            let rec_offset = self.read_u24(idx_offset + 4)?;
            if rec_offset + 4 > self.data.len() {
                break;
            }

            let end_ip = u32::from_le_bytes([
                self.data[rec_offset],
                self.data[rec_offset + 1],
                self.data[rec_offset + 2],
                self.data[rec_offset + 3],
            ]);

            if ip_num >= start_ip && ip_num <= end_ip {
                found_record_offset = rec_offset + 4;
                break;
            } else if ip_num < start_ip {
                if mid == 0 {
                    break;
                }
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        if found_record_offset == 0 || found_record_offset >= self.data.len() {
            return None;
        }

        let mut cur = found_record_offset;
        let mode = self.data[cur];
        let country: String;
        let area: String;

        if mode == 1 {
            let redirect_offset = self.read_u24(cur + 1)?;
            cur = redirect_offset;
            if cur >= self.data.len() {
                return None;
            }
            let sub_mode = self.data[cur];
            if sub_mode == 2 {
                let country_offset = self.read_u24(cur + 1)?;
                let (c, _) = self.read_string(country_offset);
                country = c;
                area = self.read_area(cur + 4);
            } else {
                let (c, next_cur) = self.read_string(cur);
                country = c;
                area = self.read_area(next_cur);
            }
        } else if mode == 2 {
            let country_offset = self.read_u24(cur + 1)?;
            let (c, _) = self.read_string(country_offset);
            country = c;
            area = self.read_area(cur + 4);
        } else {
            let (c, next_cur) = self.read_string(cur);
            country = c;
            area = self.read_area(next_cur);
        }

        let clean_country = country.replace("CZ88.NET", "").trim().to_string();
        let clean_area = area.replace("CZ88.NET", "").trim().to_string();

        Some(QqWryRecord {
            ip: ip.to_string(),
            country: clean_country,
            area: clean_area,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_qqwry_parse() {
        let db = QqWryDatabase::open("/Users/faceair/Downloads/qqwry.dat").expect("打开纯真库失败");
        println!("纯真库总记录数: {}, 版本: {}", db.total_records, db.version);
        assert!(db.total_records > 400000);

        let test_ips = vec!["180.101.50.242", "117.154.103.180", "114.114.114.114", "223.5.5.5"];
        for ip_str in test_ips {
            let ip = Ipv4Addr::from_str(ip_str).unwrap();
            let rec = db.lookup_v4(ip).expect("未命中纯真记录");
            println!("IP: {} -> Country: [{}], Area: [{}]", ip_str, rec.country, rec.area);
            assert!(!rec.country.is_empty());
        }
    }
}
