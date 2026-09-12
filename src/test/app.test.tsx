import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { SingleSearch } from "../components/SingleSearch";
import { AgentIntegration } from "../components/AgentIntegration";
import * as tauriService from "../services/tauri";

describe("GeoScope 桌面端全功能交互测试", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. 品牌与主导航测试", () => {
    it("品牌呈现为 GeoScope，主导航为『单条查询』、『批量分析』、『历史记录』、『Agent 接入』，零配置负担", () => {
      render(<App />);

      expect(screen.getByText("GeoScope")).toBeInTheDocument();
      expect(screen.getByText("单条查询")).toBeInTheDocument();
      expect(screen.getByText("批量分析")).toBeInTheDocument();
      expect(screen.getByText("历史记录")).toBeInTheDocument();
      expect(screen.getByText("Agent 接入")).toBeInTheDocument();

      // 验证没有多余设置按钮
      expect(screen.queryByText("数据库源")).not.toBeInTheDocument();
    });
  });

  describe("2. Agent 接入页面测试", () => {
    it("展示一键给 Agent 的 Skill 提示词与托管地址", () => {
      render(<AgentIntegration />);

      expect(screen.getByText("Agent 技能接入 (Skill)")).toBeInTheDocument();
      expect(screen.getAllByText(/http:\/\/127\.0\.0\.1:17890\/skill\.md/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("复制提示词发给 Agent")).toBeInTheDocument();
    });
  });

  describe("3. 单查北京大学必现验证", () => {
    it("查询 162.105.10.100 呈现北京大学大字与教育网标注", async () => {
      vi.spyOn(tauriService, "querySingle").mockResolvedValueOnce({
        query: "162.105.10.100",
        query_type: "ip",
        success: true,
        country: "中国",
        province: "北京",
        city: "北京",
        isp: "教育网/北京大学",
        qqwry_country: "中国–北京–北京–海淀区",
        qqwry_area: "教育网/北京大学",
        ipip_country: "中国",
        ipip_province: "北京",
        ipip_city: "北京",
        ipip_isp: "教育网",
        details: {},
        timestamp: Math.floor(Date.now() / 1000),
      });

      render(<SingleSearch onViewAllHistory={() => {}} />);
      const input = screen.getByPlaceholderText(/输入 IP 地址或手机号/i);
      await userEvent.type(input, "162.105.10.100");
      fireEvent.click(screen.getByRole("button", { name: "查询" }));

      await waitFor(() => {
        expect(screen.getByText("北京 海淀区")).toBeInTheDocument();
        expect(screen.getByText("北京大学")).toBeInTheDocument();
        expect(screen.getByText(/中国教育网/)).toBeInTheDocument();
      });
    });
  });
});
