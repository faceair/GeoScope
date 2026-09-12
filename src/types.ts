export interface QueryResult {
  query: string;
  query_type: "ip" | "phone" | "unknown";
  success: boolean;
  country: string;
  province: string;
  city: string;
  isp: string;
  qqwry_country?: string;
  qqwry_area?: string;
  ipip_country?: string;
  ipip_province?: string;
  ipip_city?: string;
  ipip_isp?: string;
  details: Record<string, string>;
  error_message?: string;
  timestamp: number;
}

export interface BatchResult {
  items: QueryResult[];
  total: number;
  success_count: number;
  failure_count: number;
  duration_ms: number;
}

export interface DatabaseStatus {
  qqwry_loaded: boolean;
  qqwry_path: string;
  qqwry_version: string;
  qqwry_total_records: number;
  ipdb_loaded: boolean;
  ipdb_path: string;
  ipdb_languages: string[];
  ipdb_ipv4: boolean;
  ipdb_ipv6: boolean;
  phone_loaded: boolean;
  phone_path: string;
  phone_version: string;
  phone_total_records: number;
  sqlite_path: string;
}

export interface HistoryItem {
  id: string;
  query: string;
  type: "ip" | "phone" | "unknown";
  summary: string;
  isp: string;
  success: boolean;
  timestamp: number;
  rawResult?: QueryResult;
}

export interface BatchTaskItem {
  id: string;
  title: string;
  total: number;
  success_count: number;
  failure_count: number;
  duration_ms: number;
  timestamp: number;
  items: QueryResult[];
}
