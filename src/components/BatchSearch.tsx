import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Copy,
  Check,
  Network,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { BatchResult, BatchTaskItem } from "../types";
import { queryBatch } from "../services/tauri";
import { recordBatchTask } from "../services/history";

interface BatchSearchProps {
  initialTask?: BatchTaskItem | null;
}

export const BatchSearch: React.FC<BatchSearchProps> = ({ initialTask }) => {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [filterType, setFilterType] = useState<"all" | "ip" | "phone">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failure">("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTask) {
      setBatchResult({
        items: initialTask.items,
        total: initialTask.total,
        success_count: initialTask.success_count,
        failure_count: initialTask.failure_count,
        duration_ms: initialTask.duration_ms,
      });
      setInputText(initialTask.items.map((i) => i.query).join("\n"));
    }
  }, [initialTask]);

  const handleStartBatch = async () => {
    const lines = inputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    setLoading(true);
    try {
      const res = await queryBatch(lines);
      setBatchResult(res);
      await recordBatchTask(res);
    } catch (e) {
      console.error("批量查询异常:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportCSV = () => {
    if (!batchResult || batchResult.items.length === 0) return;

    const headers = ["查询目标", "类型", "状态", "国家", "省份", "城市", "运营商/机构", "附加详情"];
    const rows = batchResult.items.map((item) => [
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
    a.download = `geoscope_batch_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!batchResult) return;
    const jsonStr = JSON.stringify(batchResult, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geoscope_batch_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredItems = (batchResult?.items || []).filter((item) => {
    if (filterType !== "all" && item.query_type !== filterType) return false;
    if (filterStatus === "success" && !item.success) return false;
    if (filterStatus === "failure" && item.success) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      const match =
        item.query.toLowerCase().includes(kw) ||
        item.province.toLowerCase().includes(kw) ||
        item.city.toLowerCase().includes(kw) ||
        item.isp.toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });

  const parsedLineCount = inputText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* 顶部输入卡片 */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              批量查询与分析
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              完全离线查询
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
              {parsedLineCount} 行待查
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              导入 TXT/CSV
            </button>

            {inputText && (
              <button
                onClick={() => setInputText("")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-transparent text-xs transition-colors"
                title="清空输入"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              data-testid="start-batch-btn"
              onClick={handleStartBatch}
              disabled={loading || parsedLineCount === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? "分析中..." : "开始批量分析"}
            </button>
          </div>
        </div>

        <textarea
          data-testid="batch-textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="在此粘贴批量 IP 或手机号，一行一个。例如：&#10;114.114.114.114&#10;180.101.50.242&#10;13800138000&#10;19200010000"
          rows={6}
          className="w-full p-3 bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-y transition-colors"
        />
      </div>

      {batchResult && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 font-medium">查询总数</span>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {batchResult.total}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-1">
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                成功命中
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {batchResult.success_count}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-1">
              <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                未命中
              </span>
              <span className="text-2xl font-bold font-mono text-rose-600">
                {batchResult.failure_count}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-1">
              <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                总耗时
              </span>
              <span className="text-2xl font-bold font-mono text-indigo-600">
                {batchResult.duration_ms} ms
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                    filterType === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  全部类型
                </button>
                <button
                  onClick={() => setFilterType("ip")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                    filterType === "ip"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  仅 IP
                </button>
                <button
                  onClick={() => setFilterType("phone")}
                  className={`px-2.5 py-1 rounded text-xs transition-colors font-medium ${
                    filterType === "phone"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  仅手机
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                    filterStatus === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilterStatus("success")}
                  className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                    filterStatus === "success"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  仅成功
                </button>
                <button
                  onClick={() => setFilterStatus("failure")}
                  className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                    filterStatus === "failure"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-rose-700"
                  }`}
                >
                  仅异常
                </button>
              </div>

              <input
                type="text"
                placeholder="搜索结果表格..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                导出 CSV
              </button>
              <button
                onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-all active:scale-95"
              >
                <FileCode className="w-3.5 h-3.5" />
                导出 JSON
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">查询目标</th>
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">归属位置</th>
                  <th className="px-4 py-3">运营商 / 机构</th>
                  <th className="px-4 py-3">附加详情</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-right">复制</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400 font-sans">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.query}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {item.query_type === "ip" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                          <Network className="w-3 h-3" />
                          IP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-600 font-medium">
                          <Smartphone className="w-3 h-3" />
                          手机
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-800">
                      {item.success ? (
                        <span>
                          {item.province} {item.city}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-800 font-medium">
                      {item.isp || "-"}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-500 text-[11px]">
                      {item.details.zip_code && `邮编:${item.details.zip_code} `}
                      {item.details.area_code && `区号:${item.details.area_code} `}
                      {item.details.latitude &&
                        `${item.details.latitude},${item.details.longitude}`}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {item.success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200/80 font-medium">
                          <XCircle className="w-2.5 h-2.5 text-rose-600" />
                          异常
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          handleCopy(
                            `${item.query}\t${item.province}\t${item.city}\t${item.isp}`,
                            `row_${idx}`
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="复制"
                      >
                        {copiedId === `row_${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
