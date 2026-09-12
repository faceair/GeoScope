import { useState, useEffect, useRef } from "react";
import {
  Search,
  Smartphone,
  Network,
  Copy,
  Check,
  MapPin,
  Clock,
  RotateCcw,
  AlertTriangle,
  Building2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { HistoryItem } from "../types";
import { querySingle } from "../services/tauri";
import { recordQueryResult, loadHistory } from "../services/history";
import { mergeGeoResult, MergedGeoInfo } from "../utils/geoMerge";
import { getCoordinatesForLocation } from "../utils/cityCoordinates";
import { wgs84ToGcj02 } from "../utils/coordinateTransform";
import { openExternalUrl } from "../utils/openUrl";

interface SingleSearchProps {
  initialQuery?: string;
  onViewAllHistory: () => void;
}

export const SingleSearch: React.FC<SingleSearchProps> = ({
  initialQuery = "",
  onViewAllHistory,
}) => {
  const [inputVal, setInputVal] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [merged, setMerged] = useState<MergedGeoInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshRecent = () => {
    loadHistory().then((items) => setRecentHistory(items.slice(0, 6)));
  };

  useEffect(() => {
    refreshRecent();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setInputVal(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery !== undefined ? targetQuery : inputVal).trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await querySingle(q);
      const m = mergeGeoResult(res);
      setMerged(m);
      await recordQueryResult(res);
      refreshRecent();
    } catch (err) {
      console.error("查询失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    if (!merged) return;
    const parts = [merged.query, merged.fullLocation, merged.primaryOrg];
    if (merged.secondaryNote) parts.push(`(${merged.secondaryNote})`);
    navigator.clipboard.writeText(parts.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyCoordinates = (e: React.MouseEvent, coordsText: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(coordsText);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 1500);
  };

  let mapCoords: [number, number] | null = null;
  if (merged && merged.success) {
    if (merged.extra["纬度"] && merged.extra["经度"]) {
      const lat = parseFloat(merged.extra["纬度"]);
      const lng = parseFloat(merged.extra["经度"]);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        mapCoords = [lat, lng];
      }
    }
    if (!mapCoords && (merged.city || merged.province)) {
      mapCoords = getCoordinatesForLocation(merged.city, merged.province);
    }
  }

  const openAmap = () => {
    if (!merged) return;
    const locationTitle = merged.fullLocation || merged.query;

    if (mapCoords) {
      const [gcjLat, gcjLng] = wgs84ToGcj02(mapCoords[0], mapCoords[1]);
      const url = `https://uri.amap.com/marker?position=${gcjLng.toFixed(6)},${gcjLat.toFixed(6)}&name=${encodeURIComponent(locationTitle)}&coordinate=gaode`;
      openExternalUrl(url);
    } else {
      const url = `https://www.amap.com/search?query=${encodeURIComponent(locationTitle)}`;
      openExternalUrl(url);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 搜索输入框 */}
      <div className="flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all"
        >
          <div className="absolute left-4 pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-slate-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="输入 IP 地址或手机号，按回车查询..."
            className="w-full pl-12 pr-28 py-3.5 bg-transparent rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/80 rounded-md select-none font-mono">
              ⌘K
            </kbd>
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
            >
              {loading ? "查询中" : "查询"}
            </button>
          </div>
        </form>

        {/* 核心离线安全提示: 给用户切实的安心感 */}
        <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>内置本地数据库 · 完全离线查询 · 数据不出本机</span>
          </span>
          <span>支持 IPv4 / IPv6 / 11位手机号</span>
        </div>
      </div>

      {/* 查询结果展示 */}
      {merged && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-5 animate-in fade-in duration-150">
          {merged.success ? (
            <>
              {/* 卡片头部行: 标题、元数据与右上角操作 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    {merged.queryType === "ip" ? (
                      <Network className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-cyan-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                        {merged.query}
                      </h2>
                      {merged.extra["网络类型"] && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {merged.extra["网络类型"].split(" ")[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {new Date(merged.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors border border-slate-200 shadow-sm active:scale-95 font-medium"
                  title="复制完整查询结果"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>

              {/* 冲突提示条 */}
              {merged.conflicts.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex flex-col gap-1 text-xs text-amber-800">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>数据源存在差异:</span>
                  </div>
                  {merged.conflicts.map((c, i) => (
                    <div key={i} className="pl-5 text-amber-700/90 font-mono">
                      • {c.label}: 纯真库为 “{c.qqwryValue}”，IPIP 库为 “{c.ipipValue}”
                    </div>
                  ))}
                </div>
              )}

              {/* 核心两大看板: 归属地 与 机构/运营商 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    归属地
                  </span>
                  <div>
                    <div className="text-xl font-bold text-slate-900 tracking-wide">
                      {merged.fullLocation}
                    </div>
                    {merged.country && (
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        国家: {merged.country}
                        {merged.extra["行政代码"] ? ` · 行政代码: ${merged.extra["行政代码"]}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    机构 / 运营商
                  </span>
                  <div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {merged.primaryOrg}
                    </div>
                    {merged.secondaryNote && (
                      <div className="text-xs text-indigo-600 mt-1 font-medium">
                        {merged.secondaryNote}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 附加参数网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {mapCoords && (
                  <div
                    onClick={openAmap}
                    className="p-2.5 rounded-lg bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/70 hover:border-indigo-300 flex flex-col justify-between gap-1 sm:col-span-2 cursor-pointer transition-all group shadow-sm"
                    title="点击在高德地图中打开此位置"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        经纬度坐标 (点击高德地图查看)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) =>
                            copyCoordinates(
                              e,
                              `${mapCoords![0].toFixed(4)}, ${mapCoords![1].toFixed(4)}`
                            )
                          }
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                          title="复制经纬度"
                        >
                          {copiedCoords ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                      <span>{mapCoords[0].toFixed(4)}° N, {mapCoords[1].toFixed(4)}° E</span>
                      <span className="text-[10px] text-indigo-600 font-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        打开高德 ↗
                      </span>
                    </div>
                  </div>
                )}

                {merged.extra["长途区号"] && (
                  <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-400">长途区号</span>
                    <span className="text-xs font-mono font-medium text-slate-800">
                      0{merged.extra["长途区号"].replace(/^0+/, "")}
                    </span>
                  </div>
                )}

                {merged.extra["邮政编码"] && (
                  <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-400">邮政编码</span>
                    <span className="text-xs font-mono font-medium text-slate-800">
                      {merged.extra["邮政编码"]}
                    </span>
                  </div>
                )}

                {merged.extra["时区"] && (
                  <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-400">时区</span>
                    <span className="text-xs font-mono font-medium text-slate-800 truncate">
                      {merged.extra["时区"]}
                    </span>
                  </div>
                )}

                {merged.extra["网络类型"] && (
                  <div className="p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-400">网络作用域</span>
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {merged.extra["网络类型"]}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{merged.errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 最近查询快捷项 */}
      {recentHistory.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              最近查询
            </span>
            <button
              onClick={onViewAllHistory}
              className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
            >
              全部历史 →
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setInputVal(item.query);
                  handleSearch(item.query);
                }}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-700 transition-all shadow-sm active:scale-95"
              >
                <span className="font-mono text-slate-800 font-medium">{item.query}</span>
                <span className="text-[11px] text-slate-400 border-l border-slate-200 pl-1.5">
                  {item.summary}
                </span>
                <RotateCcw className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
