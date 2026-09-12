import React from "react";
import {
  Search,
  ListOrdered,
  History,
  Bot,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export type NavTab = "single" | "batch" | "history" | "agent";

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Brand: 专属高质感雷达视界 BrandLogo */}
      <div className="flex items-center gap-2.5">
        <BrandLogo size={32} />
        <span className="font-bold text-sm tracking-wide text-slate-900">
          GeoScope
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shadow-inner">
        <button
          onClick={() => onTabChange("single")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === "single"
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          单条查询
        </button>

        <button
          onClick={() => onTabChange("batch")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === "batch"
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
          批量分析
        </button>

        <button
          onClick={() => onTabChange("history")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === "history"
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          历史记录
        </button>

        <button
          onClick={() => onTabChange("agent")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentTab === "agent"
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-slate-500" />
          Agent 接入
        </button>
      </nav>

      {/* 右侧完全留白 */}
      <div className="w-24 hidden md:block" />
    </header>
  );
};
