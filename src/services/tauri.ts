import { invoke, isTauri } from "@tauri-apps/api/core";
import { BatchResult, DatabaseStatus, QueryResult } from "../types";

export async function querySingle(query: string): Promise<QueryResult> {
  if (isTauri()) {
    return await invoke<QueryResult>("query_single", { query });
  }

  console.warn("Not in Tauri environment, using mock fallback");
  return {
    query,
    query_type: query.includes(".") ? "ip" : "phone",
    success: true,
    country: "中国",
    province: "江苏",
    city: "南京",
    isp: "中国电信",
    qqwry_country: "中国–江苏–南京",
    qqwry_area: "电信",
    ipip_country: "中国",
    ipip_province: "江苏",
    ipip_city: "南京",
    ipip_isp: "电信",
    details: {
      latitude: "32.0603",
      longitude: "118.7969",
      zip_code: "210000",
      area_code: "025",
    },
    timestamp: Math.floor(Date.now() / 1000),
  };
}

export async function queryBatch(queries: string[]): Promise<BatchResult> {
  if (isTauri()) {
    return await invoke<BatchResult>("query_batch", { queries });
  }

  const items = await Promise.all(queries.map((q) => querySingle(q)));
  return {
    items,
    total: items.length,
    success_count: items.filter((i) => i.success).length,
    failure_count: items.filter((i) => !i.success).length,
    duration_ms: 12,
  };
}

export async function getDbStatus(): Promise<DatabaseStatus> {
  if (isTauri()) {
    return await invoke<DatabaseStatus>("get_db_status");
  }

  return {
    qqwry_loaded: true,
    qqwry_path: "/Users/faceair/Downloads/qqwry.dat",
    qqwry_version: "纯真网络 2026年09月02日IP数据",
    qqwry_total_records: 1566929,
    ipdb_loaded: true,
    ipdb_path: "/Users/faceair/Downloads/ipip_china_cn.ipdb",
    ipdb_languages: ["CN"],
    ipdb_ipv4: true,
    ipdb_ipv6: true,
    phone_loaded: true,
    phone_path: "/Users/faceair/Downloads/phone.dat",
    phone_version: "2502",
    phone_total_records: 517259,
    sqlite_path: "/Users/faceair/Library/Application Support/com.geoscope.app/geoscope.db",
  };
}

export async function updateDbPaths(
  qqwryPath?: string,
  ipdbPath?: string,
  phonePath?: string
): Promise<DatabaseStatus> {
  if (isTauri()) {
    return await invoke<DatabaseStatus>("update_db_paths", {
      qqwryPath: qqwryPath || null,
      ipdbPath: ipdbPath || null,
      phonePath: phonePath || null,
    });
  }

  return getDbStatus();
}

export async function selectFile(
  fileType: "qqwry" | "ipdb" | "phone"
): Promise<string | null> {
  if (isTauri()) {
    return await invoke<string | null>("select_file", { fileType });
  }

  return null;
}
