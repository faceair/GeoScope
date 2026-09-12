import { useState } from "react";
import { Navbar, NavTab } from "./components/Navbar";
import { SingleSearch } from "./components/SingleSearch";
import { BatchSearch } from "./components/BatchSearch";
import { HistoryView } from "./components/HistoryView";
import { AgentIntegration } from "./components/AgentIntegration";
import { BatchTaskItem } from "./types";

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("single");
  const [activeSingleQuery, setActiveSingleQuery] = useState("");
  const [activeBatchTask, setActiveBatchTask] = useState<BatchTaskItem | null>(null);

  const handleSelectHistoryQuery = (query: string) => {
    setActiveSingleQuery(query);
    setCurrentTab("single");
  };

  const handleOpenBatchTask = (task: BatchTaskItem) => {
    setActiveBatchTask(task);
    setCurrentTab("batch");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col antialiased">
      {/* 顶部纯白磨砂导航栏 (纯功能导航，零管理页面与配置负担) */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* 主工作区 */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === "single" && (
          <SingleSearch
            initialQuery={activeSingleQuery}
            onViewAllHistory={() => setCurrentTab("history")}
          />
        )}

        {currentTab === "batch" && (
          <BatchSearch initialTask={activeBatchTask} />
        )}

        {currentTab === "history" && (
          <HistoryView
            onSelectQuery={handleSelectHistoryQuery}
            onOpenBatchTask={handleOpenBatchTask}
          />
        )}

        {currentTab === "agent" && <AgentIntegration />}
      </main>
    </div>
  );
}

export default App;
