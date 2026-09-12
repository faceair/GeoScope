import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";

export async function openExternalUrl(url: string): Promise<void> {
  try {
    if (isTauri()) {
      await tauriOpenUrl(url);
      return;
    }
  } catch (err) {
    console.warn("调用 Tauri Opener 插件失败，降级为 window.open:", err);
  }

  // 浏览器降级
  window.open(url, "_blank");
}
