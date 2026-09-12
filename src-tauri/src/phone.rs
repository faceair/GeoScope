use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PhoneRecord {
    pub phone: String,
    pub prefix: u32,
    pub province: String,
    pub city: String,
    pub zip_code: String,
    pub area_code: String,
    pub isp: String,
    pub card_type: u8,
}

pub struct PhoneDatabase {
    pub version: String,
    pub first_index_offset: usize,
    pub total_records: usize,
    pub path: String,
    data: Vec<u8>,
}

impl PhoneDatabase {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let mut file = File::open(&path).map_err(|e| format!("无法打开 phone.dat 文件: {}", e))?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)
            .map_err(|e| format!("读取 phone.dat 失败: {}", e))?;

        if data.len() < 8 {
            return Err("phone.dat 文件损坏: 文件过小".to_string());
        }

        let version = String::from_utf8_lossy(&data[0..4]).to_string();
        let first_index_offset = u32::from_le_bytes([data[4], data[5], data[6], data[7]]) as usize;

        if first_index_offset > data.len() {
            return Err("phone.dat 索引偏移量越界".to_string());
        }

        let index_data_len = data.len() - first_index_offset;
        let total_records = index_data_len / 9;

        Ok(Self {
            version,
            first_index_offset,
            total_records,
            path: path_str,
            data,
        })
    }

    pub fn lookup(&self, phone_str: &str) -> Option<PhoneRecord> {
        let clean_digits: String = phone_str.chars().filter(|c| c.is_ascii_digit()).collect();
        if clean_digits.len() < 7 {
            return None;
        }

        let prefix = clean_digits[0..7].parse::<u32>().ok()?;

        if self.total_records == 0 {
            return None;
        }

        let mut low = 0;
        let mut high = self.total_records - 1;

        while low <= high {
            let mid = (low + high) / 2;
            let offset = self.first_index_offset + mid * 9;
            if offset + 9 > self.data.len() {
                break;
            }

            let cur_prefix = u32::from_le_bytes([
                self.data[offset],
                self.data[offset + 1],
                self.data[offset + 2],
                self.data[offset + 3],
            ]);

            if cur_prefix == prefix {
                let rec_offset = u32::from_le_bytes([
                    self.data[offset + 4],
                    self.data[offset + 5],
                    self.data[offset + 6],
                    self.data[offset + 7],
                ]) as usize;

                let card_type = self.data[offset + 8];

                if rec_offset >= self.first_index_offset {
                    return None;
                }

                let mut end = rec_offset;
                while end < self.first_index_offset && self.data[end] != 0 {
                    end += 1;
                }

                let text = String::from_utf8_lossy(&self.data[rec_offset..end]);
                let parts: Vec<&str> = text.split('|').collect();

                let province = parts.get(0).unwrap_or(&"").to_string();
                let city = parts.get(1).unwrap_or(&"").to_string();
                let zip_code = parts.get(2).unwrap_or(&"").to_string();
                let area_code = parts.get(3).unwrap_or(&"").to_string();

                let isp = match card_type {
                    1 => "中国移动",
                    2 => "中国联通",
                    3 => "中国电信",
                    4 => "中国电信虚拟运营商",
                    5 => "中国联通虚拟运营商",
                    6 => "中国移动虚拟运营商",
                    7 => "中国广电",
                    8 => "中国广电虚拟运营商",
                    _ => "未知运营商",
                }
                .to_string();

                return Some(PhoneRecord {
                    phone: phone_str.to_string(),
                    prefix,
                    province,
                    city,
                    zip_code,
                    area_code,
                    isp,
                    card_type,
                });
            } else if cur_prefix < prefix {
                low = mid + 1;
            } else {
                if mid == 0 {
                    break;
                }
                high = mid - 1;
            }
        }

        None
    }
}
