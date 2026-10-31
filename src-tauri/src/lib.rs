#[tauri::command]
#[allow(unused_variables)]
fn save_file_dialog(default_filename: String, content: String) -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let output = Command::new("zenity")
            .arg("--file-selection")
            .arg("--save")
            .arg("--confirm-overwrite")
            .arg(format!("--filename={}", default_filename))
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path_str.is_empty() {
                    std::fs::write(&path_str, content).map_err(|e| e.to_string())?;
                    return Ok(Some(path_str));
                }
            } else {
                // User cancelled dialog
                return Ok(None);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let script = format!(
            r#"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
         $f = New-Object System.Windows.Forms.SaveFileDialog;
         $f.FileName = '{}';
         if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ Write-Host $f.FileName }}"#,
            default_filename
        );
        if let Ok(out) = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output()
        {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                std::fs::write(&path_str, content).map_err(|e| e.to_string())?;
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = format!(
            r#"set theFile to choose file name with prompt "Simpan Berkas:" default name "{}"
         POSIX path of theFile"#,
            default_filename
        );
        if let Ok(out) = Command::new("osascript").args(["-e", &script]).output() {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                std::fs::write(&path_str, content).map_err(|e| e.to_string())?;
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    Ok(None)
}

#[tauri::command]
#[allow(unused_variables)]
fn pick_books_dialog() -> Result<Option<Vec<String>>, String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let output = Command::new("zenity")
            .arg("--file-selection")
            .arg("--multiple")
            .arg("--separator=|")
            .arg("--file-filter=E-Books (EPUB, PDF) | *.epub *.pdf *.EPUB *.PDF")
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path_str.is_empty() {
                    let paths: Vec<String> = path_str
                        .split('|')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    return Ok(Some(paths));
                }
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let script = r#"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
       $f = New-Object System.Windows.Forms.OpenFileDialog;
       $f.Multiselect = $true;
       $f.Filter = 'E-Books (*.epub, *.pdf)|*.epub;*.pdf|Semua Berkas (*.*)|*.*';
       if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Host ($f.FileNames -join '|') }"#;
        if let Ok(out) = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
        {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                let paths: Vec<String> = path_str
                    .split('|')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                return Ok(Some(paths));
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = r#"set theFiles to choose file with prompt "Pilih Berkas Buku (EPUB/PDF):" of type {"epub", "pdf"} with multiple selections allowed
       set out to ""
       repeat with aFile in theFiles
         set out to out & (POSIX path of aFile) & "|"
       end repeat
       if length of out > 0 then
         text 1 thru -2 of out
       else
         ""
       end if"#;
        if let Ok(out) = Command::new("osascript").args(["-e", script]).output() {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                let paths: Vec<String> = path_str
                    .split('|')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
                return Ok(Some(paths));
            }
            return Ok(None);
        }
    }

    Ok(None)
}

#[tauri::command]
#[allow(unused_variables)]
fn pick_folder_dialog() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let output = Command::new("zenity")
            .arg("--file-selection")
            .arg("--directory")
            .arg("--title=Pilih Folder Koleksi Buku")
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path_str.is_empty() {
                    return Ok(Some(path_str));
                }
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let script = r#"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
       $f = New-Object System.Windows.Forms.FolderBrowserDialog;
       $f.Description = 'Pilih Folder Koleksi Buku';
       if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Host $f.SelectedPath }"#;
        if let Ok(out) = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
        {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = r#"set theFolder to choose folder with prompt "Pilih Folder Koleksi Buku:"
       POSIX path of theFolder"#;
        if let Ok(out) = Command::new("osascript").args(["-e", script]).output() {
            let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Ok(Some(path_str));
            }
            return Ok(None);
        }
    }

    Ok(None)
}

fn walk_dir_recursive(dir: &std::path::Path, results: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = match path.file_name().and_then(|n| n.to_str()) {
                Some(name) => name,
                None => continue,
            };

            if file_name.starts_with('.')
                || file_name.starts_with('~')
                || file_name == "node_modules"
            {
                continue;
            }

            if path.is_dir() {
                walk_dir_recursive(&path, results);
            } else if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "epub" || ext_lower == "pdf" {
                        results.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
}

#[tauri::command]
fn scan_directory_books(folder_path: String) -> Result<Vec<String>, String> {
    let root = std::path::Path::new(&folder_path);
    if !root.is_dir() {
        return Err(format!("'{}' bukan sebuah direktori valid", folder_path));
    }

    let mut results = Vec::new();
    walk_dir_recursive(root, &mut results);
    Ok(results)
}

#[tauri::command]
fn read_book_file(file_path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&file_path).map_err(|e| format!("Gagal membaca berkas di '{}': {}", file_path, e))
}

#[tauri::command]
fn check_file_exists(file_path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&file_path).is_file())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            save_file_dialog,
            pick_books_dialog,
            pick_folder_dialog,
            scan_directory_books,
            read_book_file,
            check_file_exists
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
