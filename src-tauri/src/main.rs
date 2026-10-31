// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Fix WebKitGTK broken wheel scrolling, hardware acceleration, and overlay scrollbar interception on Linux
        // SAFETY: set_var is called here right at the program entry before threads are spawned by Tauri.
        unsafe {
            if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
            if std::env::var("GTK_OVERLAY_SCROLLING").is_err() {
                std::env::set_var("GTK_OVERLAY_SCROLLING", "0");
            }
        }
    }

    app_lib::run();
}
