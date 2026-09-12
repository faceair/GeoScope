import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Plug,
  ExternalLink,
  Code2,
  FileCode,
  Bot,
} from "lucide-react";

export const AgentIntegration: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const localApiBase = "http://127.0.0.1:17890";
  const skillUrl = `${localApiBase}/skill.md`;

  useEffect(() => {
    fetch(`${localApiBase}/api/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) setServerOnline(true);
      })
      .catch(() => setServerOnline(false));
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // 给 Agent 的专属提示词 (极简直奔主题)
  const agentSkillInstallPrompt = `我本地正在运行 GeoScope 离线 IP & 手机号归属地查询工具。
请帮我配置并安装该工具的 Skill 技能，完整接口与规范定义地址为：
${skillUrl}

【你的任务】
1. 读取上述 ${skillUrl} 获取工具接口与规范；
2. 将其保存或配置到当前环境的 Skills 目录中（如 ~/.claude/skills/geoscope/、.agents/skills/ 或当前工作区的自定义技能库）；
3. 安装完成后，每当我向你询问 IP 或手机号归属地时，自动调用本地 http://127.0.0.1:17890 接口进行离线极速查询。`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 顶部标题与状态 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Agent 技能接入 (Skill)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              一键让 AI 编程助手（Cursor、Claude Code、Devin 等）学会本地离线归属地查询
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <Plug className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium">本地守护服务:</span>
          {serverOnline ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              127.0.0.1:17890 在线
            </span>
          ) : (
            <span className="text-slate-600 font-mono">127.0.0.1:17890</span>
          )}
        </div>
      </div>

      {/* 核心主卡片: 一键发给 Agent 安装 Skill */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              一键提示词 (发送给 Agent 自动安装)
            </h3>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(agentSkillInstallPrompt, "prompt")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            {copiedKey === "prompt" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>已复制提示词</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制提示词发给 Agent</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          复制下方这段提示词直接发送给你的 AI 助手，Agent 将自动抓取本地 API 托管的 <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">skill.md</code> 并在当前环境中自动完成技能安装配置。
        </p>

        {/* Skill 文件托管地址卡片 */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-700">Skill 规范定义地址:</span>
            <code className="text-xs font-mono font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
              {skillUrl}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(skillUrl, "url")}
              className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-white rounded-lg transition-colors font-medium flex items-center gap-1"
            >
              {copiedKey === "url" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>复制地址</span>
            </button>
            <a
              href={skillUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors font-medium flex items-center gap-1"
              title="在浏览器中查看 Skill Markdown 原文"
            >
              <span>查看原文</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* 提示词内容框 */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[11px] text-slate-400 font-medium">提示词内容:</span>
          <pre className="p-4 rounded-xl bg-slate-900 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[160px] overflow-y-auto shadow-inner select-all">
            {agentSkillInstallPrompt}
          </pre>
        </div>
      </div>

      {/* 底部紧凑的本地 REST API 路由表 */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-900">本地 API 接口速查</h4>
          </div>
          <span className="text-[11px] text-slate-400">仅限 127.0.0.1 访问</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
            <span className="font-mono text-[11px] text-indigo-700 font-semibold truncate">
              GET /skill.md
            </span>
            <span className="text-slate-500 text-[11px]">Skill 规范定义文件</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
            <span className="font-mono text-[11px] text-indigo-700 font-semibold truncate">
              GET /api/query?q=...
            </span>
            <span className="text-slate-500 text-[11px]">单条 IP 或手机号物理归属</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex flex-col gap-0.5">
            <span className="font-mono text-[11px] text-indigo-700 font-semibold truncate">
              POST /api/batch
            </span>
            <span className="text-slate-500 text-[11px]">高并发批量查询 (JSON 数组)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
