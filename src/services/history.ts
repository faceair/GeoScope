import { invoke, isTauri } from "@tauri-apps/api/core";
import { BatchResult, BatchTaskItem, HistoryItem, QueryResult } from "../types";

const SINGLE_STORAGE_KEY = "geoscope_single_history_v2";
const BATCH_STORAGE_KEY = "geoscope_batch_tasks_v2";
const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;

function isWithin30Days(timestamp: number): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec - timestamp <= THIRTY_DAYS_SEC;
}

// ---------------- 1. 单条查询历史 (SQLite 驱动) ----------------

export async function loadHistory(): Promise<HistoryItem[]> {
  if (isTauri()) {
    try {
      return await invoke<HistoryItem[]>("get_single_history");
    } catch (e) {
      console.error("从 SQLite 加载单条历史失败:", e);
    }
  }

  // 降级 fallback (纯浏览器环境)
  try {
    const raw = localStorage.getItem(SINGLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: HistoryItem[] = JSON.parse(raw);
    return parsed.filter((item) => isWithin30Days(item.timestamp));
  } catch {
    return [];
  }
}

export async function recordQueryResult(result: QueryResult): Promise<HistoryItem> {
  const summaryParts = [result.country, result.province, result.city].filter(
    (p) => p && p.trim().length > 0
  );
  const summary =
    summaryParts.length > 0 ? summaryParts.join(" · ") : "无归属地信息";

  const item: HistoryItem = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    query: result.query,
    type: result.query_type,
    summary,
    isp: result.isp || "未知运营商",
    success: result.success,
    timestamp: result.timestamp || Math.floor(Date.now() / 1000),
    rawResult: result,
  };

  if (isTauri()) {
    try {
      await invoke("save_single_history", { item });
      return item;
    } catch (e) {
      console.error("写入 SQLite 单条历史失败:", e);
    }
  }

  // Fallback 写入 localStorage
  try {
    const existing = await loadHistory();
    const filtered = existing.filter((h) => h.query !== result.query);
    const updated = [item, ...filtered];
    localStorage.setItem(SINGLE_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return item;
}

export async function removeHistoryItem(id: string): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("delete_single_history", { id });
      return;
    } catch (e) {
      console.error("从 SQLite 删除单条历史失败:", e);
    }
  }

  try {
    const existing = await loadHistory();
    const filtered = existing.filter((item) => item.id !== id);
    localStorage.setItem(SINGLE_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function clearAllHistory(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("clear_single_history");
      return;
    } catch (e) {
      console.error("清空 SQLite 单条历史失败:", e);
    }
  }

  localStorage.removeItem(SINGLE_STORAGE_KEY);
}

// ---------------- 2. 批量任务批次 (SQLite 驱动) ----------------

export async function loadBatchTasks(): Promise<BatchTaskItem[]> {
  if (isTauri()) {
    try {
      return await invoke<BatchTaskItem[]>("get_batch_tasks");
    } catch (e) {
      console.error("从 SQLite 加载批量任务失败:", e);
    }
  }

  // Fallback
  try {
    const raw = localStorage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return [];
    const parsed: BatchTaskItem[] = JSON.parse(raw);
    return parsed.filter((task) => isWithin30Days(task.timestamp));
  } catch {
    return [];
  }
}

export async function recordBatchTask(result: BatchResult): Promise<BatchTaskItem> {
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const task: BatchTaskItem = {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: `批量分析 (${result.total} 条) · ${dateStr}`,
    total: result.total,
    success_count: result.success_count,
    failure_count: result.failure_count,
    duration_ms: result.duration_ms,
    timestamp: Math.floor(Date.now() / 1000),
    items: result.items,
  };

  if (isTauri()) {
    try {
      await invoke("save_batch_task", { task });
      return task;
    } catch (e) {
      console.error("写入 SQLite 批量任务失败:", e);
    }
  }

  // Fallback
  try {
    const existing = await loadBatchTasks();
    const updated = [task, ...existing];
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return task;
}

export async function removeBatchTask(id: string): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("delete_batch_task", { id });
      return;
    } catch (e) {
      console.error("从 SQLite 删除批量任务失败:", e);
    }
  }

  try {
    const existing = await loadBatchTasks();
    const filtered = existing.filter((t) => t.id !== id);
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function clearAllBatchTasks(): Promise<void> {
  if (isTauri()) {
    try {
      await invoke("clear_batch_tasks");
      return;
    } catch (e) {
      console.error("清空 SQLite 批量任务失败:", e);
    }
  }

  localStorage.removeItem(BATCH_STORAGE_KEY);
}
