use tauri::{Manager, Emitter};
use std::sync::Mutex;
use tauri_plugin_global_shortcut::ShortcutState;

// 图片覆盖窗口状态
struct OverlayState {
    is_penetrable: bool,  // 是否可穿透
}

static OVERLAY_STATE: Mutex<OverlayState> = Mutex::new(OverlayState {
    is_penetrable: false,
});


#[tauri::command]
async fn show_image_overlay(app: tauri::AppHandle, image_path: String) -> Result<(), String> {
    // 获取预定义的图片窗口
    if let Some(window) = app.get_webview_window("image-overlay") {
        // 如果窗口已存在，更新URL并显示
        let url = format!("image-overlay.html?img={}", urlencoding::encode(&image_path));
        window.eval(&format!("window.location.href = '{}'", url))
            .map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn close_image_overlay(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("image-overlay") {
        // 重置穿透状态
        let mut state = OVERLAY_STATE.lock().unwrap();
        state.is_penetrable = false;
        drop(state);
        
        // 确保窗口恢复可交互状态后再隐藏
        window.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn toggle_penetrable(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("image-overlay") {
        let mut state = OVERLAY_STATE.lock().unwrap();
        state.is_penetrable = !state.is_penetrable;
        let new_state = state.is_penetrable;
        drop(state);
        
        window.set_ignore_cursor_events(new_state)
            .map_err(|e| e.to_string())?;
        
        // 通知前端更新UI状态
        window.emit("penetrable-changed", new_state)
            .map_err(|e| e.to_string())?;
        
        Ok(new_state)
    } else {
        Err("图片覆盖窗口未找到".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 根据平台选择修饰键字符串
            let shortcuts = if cfg!(target_os = "macos") {
                vec!["Cmd+1"]
            } else {
                vec!["Ctrl+1"]
            };
            
            // 注册全局快捷键插件
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcuts(shortcuts.clone())?
                    .with_handler(move |app, _shortcut, event| {
                        // 只在按下时触发，不在释放时触发
                        if event.state == ShortcutState::Pressed {
                            println!("快捷键触发 - 切换穿透状态");
                            
                            if let Some(window) = app.get_webview_window("image-overlay") {
                                if window.is_visible().unwrap_or(false) {
                                    // 切换穿透状态
                                    let mut state = OVERLAY_STATE.lock().unwrap();
                                    state.is_penetrable = !state.is_penetrable;
                                    let new_state = state.is_penetrable;
                                    drop(state);
                                    
                                    let _ = window.set_ignore_cursor_events(new_state);
                                    let _ = window.emit("penetrable-changed", new_state);
                                    println!("穿透状态切换为: {}", new_state);
                                }
                            }
                        }
                    })
                    .build(),
            )?;
            
            println!("全局快捷键已注册: {:?}", shortcuts);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_image_overlay, 
            close_image_overlay,
            toggle_penetrable
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
