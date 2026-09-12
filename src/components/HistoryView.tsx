import { useState, useEffect } from "react";
import {
  History,
  Trash2,
  Search,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Network,
  Smartphone,
  Download,
  X,
  FileSpreadsheet,
  Clock,
  ArrowRight,
} from "lucide-react";
import { BatchTaskItem, HistoryItem } from "../types";
import {
  loadHistory,
  removeHistoryItem,
  clearAllHistory,
  loadBatchTasks,
  removeBatchTask,
  clearAllBatchTasks,
} from "../services/history";

interface HistoryViewProps {
  onSelectQuery: (query: string) => void;
  onOpenBatchTask: (task: BatchTaskItem) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelectQuery,
  onOpenBatchTask,
}) => {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // 单条查询状态
  const [singleHistory, setSingleHistory] = useState<HistoryItem[]>([]);
  const [searchKw, setSearchKw] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "ip" | "phone">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClearSingle, setConfirmClearSingle] = useState(false);

  // 批量批次状态
  const [batchTasks, setBatchTasks] = useState<BatchTaskItem[]>([]);
  const [confirmClearBatch, setConfirmClearBatch] = useState(false);

  const refreshData = async () => {
    const singles = await loadHistory();
    setSingleHistory(singles);
    const batches = await loadBatchTasks();
    setBatchTasks(batches);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDeleteSingle = async (id: string) => {
    await removeHistoryItem(id);
    const updated = await loadHistory();
    setSingleHistory(updated);
  };

  const handleClearSingle = async () => {
    await clearAllHistory();
    setSingleHistory([]);
    setConfirmClearSingle(false);
  };

  const handleDeleteBatch = async (id: string) => {
    await removeBatchTask(id);
    const updated = await loadBatchTasks();
    setBatchTasks(updated);
  };

  const handleClearBatch = async () => {
    await clearAllBatchTasks();
    setBatchTasks([]);
    setConfirmClearBatch(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportSingleCSV = () => {
    if (singleHistory.length === 0) return;
    const headers = ["查询目标", "类型", "归属地", "运营商/机构", "状态", "查询时间"];
    const rows = singleHistory.map((item) => [
      `"${item.query}"`,
      `"${item.type}"`,
      `"${item.summary}"`,
      `"${item.isp}"`,
      `"${item.success ? "成功" : "失败"}"`,
      `"${new Date(item.timestamp * 1000).toLocaleString()}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geoscope_single_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBatchTaskCSV = (task: BatchTaskItem) => {
    const headers = ["查询目标", "类型", "状态", "国家", "省份", "城市", "运营商/机构", "附加详情"];
    const rows = task.items.map((item) => [
      `"${item.query}"`,
      `"${item.query_type}"`,
      `"${item.success ? "成功" : "失败"}"`,
      `"${item.country || ""}"`,
      `"${item.province || ""}"`,
      `"${item.city || ""}"`,
      `"${item.isp || ""}"`,
      `"${JSON.stringify(item.details).replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.title.replace(/[\s/:]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSingle = singleHistory.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (searchKw) {
      const kw = searchKw.toLowerCase();
      const match =
        item.query.toLowerCase().includes(kw) ||
        item.summary.toLowerCase().includes(kw) ||
        item.isp.toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* 顶部总览栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">查询历史</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              自动保留最近 30 天的查询记录
            </p>
          </div>
        </div>

        {/* 二级切换 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "single"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            单条查询 ({singleHistory.length})
          </button>
          <button
            data-testid="batch-tasks-tab"
            onClick={() => setActiveTab("batch")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === "batch"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            批量分析 ({batchTasks.length})
          </button>
        </div>
      </div>

      {/* 1. 单条记录视图 */}
      {activeTab === "single" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  typeFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setTypeFilter("ip")}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  typeFilter === "ip"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                仅 IP
              </button>
              <button
                onClick={() => setTypeFilter("phone")}
                className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                  typeFilter === "phone"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                仅手机
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索目标、城市、机构..."
                  value={searchKw}
                  onChange={(e) => setSearchKw(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>

              {singleHistory.length > 0 && (
                <>
                  <button
                    onClick={exportSingleCSV}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出 CSV
                  </button>

                  {confirmClearSingle ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-xl animate-in fade-in">
                      <button
                        data-testid="confirm-clear-btn"
                        onClick={handleClearSingle}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        确认清空
                      </button>
                      <button
                        onClick={() => setConfirmClearSingle(false)}
                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      data-testid="clear-all-btn"
                      onClick={() => setConfirmClearSingle(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs text-rose-700 border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      清空记录
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {filteredSingle.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white flex flex-col items-center gap-2 text-slate-400 text-xs shadow-sm">
              <Calendar className="w-8 h-8 text-slate-300" />
              <span>{searchKw ? "未找到符合条件的记录" : "暂无查询记录"}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredSingle.map((item) => (
                <div
                  key={item.id}
                  className="group p-3.5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      {item.type === "ip" ? (
                        <Network className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-cyan-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          {item.query}
                        </span>
                        <span className="text-xs text-slate-600 font-sans">
                          {item.summary}
                        </span>
                        {item.isp && item.isp !== "未知运营商" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-sans border border-slate-200 font-medium">
                            {item.isp}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        {new Date(item.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => onSelectQuery(item.query)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-colors"
                      title="回填到首页重新查询"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>重查</span>
                    </button>

                    <button
                      onClick={() =>
                        handleCopy(
                          `${item.query} ${item.summary} ${item.isp}`,
                          item.id
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title="复制"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      data-testid={`delete-item-${item.id}`}
                      onClick={() => handleDeleteSingle(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. 批量分析记录视图 */}
      {activeTab === "batch" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-500">
              共 {batchTasks.length} 次批量分析 (点击可查看详情)
            </span>

            {batchTasks.length > 0 && (
              confirmClearBatch ? (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-xl animate-in fade-in">
                  <button
                    data-testid="confirm-clear-batch-btn"
                    onClick={handleClearBatch}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    确认清空全部
                  </button>
                  <button
                    onClick={() => setConfirmClearBatch(false)}
                    className="p-1 rounded-lg hover:bg-rose-100 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  data-testid="clear-all-batch-btn"
                  onClick={() => setConfirmClearBatch(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs text-rose-700 border border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空批量
                </button>
              )
            )}
          </div>

          {batchTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white flex flex-col items-center gap-2 text-slate-400 text-xs shadow-sm">
              <FileSpreadsheet className="w-8 h-8 text-slate-300" />
              <span>暂无批量分析记录</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {batchTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        {task.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteBatch(task.id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="删除此记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-medium">总数</span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          {task.total}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 block font-medium">成功</span>
                        <span className="text-base font-bold font-mono text-emerald-700">
                          {task.success_count}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-medium">耗时</span>
                        <span className="text-base font-bold font-mono text-indigo-700">
                          {task.duration_ms} ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.timestamp * 1000).toLocaleString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportBatchTaskCSV(task)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors text-xs font-medium"
                        title="导出 CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>导出</span>
                      </button>

                      <button
                        onClick={() => onOpenBatchTask(task)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors shadow-sm text-xs active:scale-95"
                        title="查看分析表格"
                      >
                        <span>查看详情</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
