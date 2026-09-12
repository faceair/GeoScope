pub mod commands;
pub mod db_manager;
pub mod http_server;
pub mod models;
pub mod phone;
pub mod qqwry;
pub mod storage;

use commands::{
    clear_batch_tasks, clear_single_history, delete_batch_task, delete_single_history,
    get_batch_tasks, get_db_status, get_single_history, query_batch, query_single,
    save_batch_task, save_single_history, select_file, update_db_paths,
};
use db_manager::DatabaseManager;
use http_server::HttpServer;
use std::sync::Arc;
use storage::StorageManager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_manager = Arc::new(DatabaseManager::new());
    let storage_manager = Arc::new(StorageManager::new().expect("初始化 SQLite 存储失败"));

    // 启动本地 Agent HTTP 守护服务 (127.0.0.1:17890)
    let _ = HttpServer::start(db_manager.clone(), storage_manager.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_manager)
        .manage(storage_manager)
        .setup(|app| {
            // 1. 在 macOS 下即使在 `tauri dev` 调试模式下也通过 Cocoa API 动态注入最新浅白 Dock 图标
            #[cfg(target_os = "macos")]
            {
                use objc2::AnyThread;
                use objc2_app_kit::{NSApplication, NSImage};
                use objc2_foundation::{MainThreadMarker, NSData};

                if let Some(mtm) = MainThreadMarker::new() {
                    let icon_bytes = include_bytes!("../icons/icon.png");
                    let data = NSData::with_bytes(icon_bytes);
                    if let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) {
                        let ns_app = NSApplication::sharedApplication(mtm);
                        unsafe {
                            ns_app.setApplicationIconImage(Some(&image));
                        }
                    }
                }
            }

            // 2. 窗口图标设置 (Windows / Linux)
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/128x128@2x.png")) {
                    let _ = window.set_icon(icon);
                }
            }

            // 3. 构建系统托盘右键菜单
            let show_item = MenuItem::with_id(app, "show", "显示 GeoScope", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 4. 强制使用编译期内嵌的 32x32 图标，保证 dev 调试模式下托盘图标生效
            let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
                .ok()
                .or_else(|| app.default_window_icon().cloned());

            let mut builder = TrayIconBuilder::new()
                .tooltip("GeoScope - 离线归属地查询")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = tray_icon {
                builder = builder.icon(icon);
            }

            builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 点击窗口关闭按钮 (红叉) 时隐藏到托盘
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            query_single,
            query_batch,
            get_db_status,
            update_db_paths,
            select_file,
            get_single_history,
            save_single_history,
            delete_single_history,
            clear_single_history,
            get_batch_tasks,
            save_batch_task,
            delete_batch_task,
            clear_batch_tasks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_queries() {
        let mgr = DatabaseManager::new();
        let status = mgr.get_status();

        assert!(status.qqwry_loaded, "QQWry should be loaded");
        assert!(status.ipdb_loaded, "IPDB should be loaded");
        assert!(status.phone_loaded, "Phone database should be loaded");

        let res_ip = mgr.query_single("180.101.50.242");
        assert!(res_ip.success);
        assert_eq!(res_ip.query_type, "ip");
    }

    #[test]
    fn test_sqlite_storage() {
        let storage = StorageManager::new().expect("SQLite 初始化");
        println!("SQLite 数据库路径: {}", storage.db_path);

        let item = models::HistoryItem {
            id: format!("test_{}", chrono::Utc::now().timestamp_millis()),
            query: "180.101.50.242".to_string(),
            type_: "ip".to_string(),
            summary: "江苏 南京".to_string(),
            isp: "电信".to_string(),
            success: true,
            timestamp: chrono::Utc::now().timestamp(),
            raw_result: None,
        };
        storage.insert_single_history(item.clone()).unwrap();

        let list = storage.get_single_history().unwrap();
        assert!(list.iter().any(|i| i.query == "180.101.50.242"));

        storage.delete_single_history(&item.id).unwrap();
    }
}
