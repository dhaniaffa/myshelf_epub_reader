#[tauri::command]
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
    if let Ok(out) = Command::new("powershell").args(["-NoProfile", "-Command", &script]).output() {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![save_file_dialog])
    .setup(|app| {
      #[cfg(desktop)]
      {
        app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
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
