interface AndroidBackupBridge {
  saveFileWithPicker?: (filename: string, content: string, mimeType: string) => void;
  saveFile?: (filename: string, content: string, mimeType: string) => void;
  exitApp?: () => void;
  pickBooks?: () => void;
  pickFolder?: () => void;
  readBookBinaryBase64?: (uriString: string) => string | null;
  checkUriValid?: (uriString: string) => boolean;
}

interface TauriProcess {
  exit?: (code?: number) => Promise<void> | void;
}

interface TauriGlobal {
  process?: TauriProcess;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept?: Record<string, string[]>;
  }>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

declare global {
  interface Window {
    __activeUtterance?: SpeechSynthesisUtterance | null;
    __androidBackupCallback?: (result: { success: boolean; error?: string }) => void;
    __onAndroidSaveResult?: ((success: boolean) => void) | null;
    __onAndroidPickBooksResult?:
      ((results: Array<{ uri: string; name: string; size: number }>) => void) | null;
    __onAndroidPickFolderResult?:
      ((results: Array<{ uri: string; name: string; size: number }>) => void) | null;
    __handleAndroidBack?: (() => boolean) | null;
    AndroidBackupBridge?: AndroidBackupBridge;
    __TAURI__?: TauriGlobal;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  interface CSSStyleDeclaration {
    webkitTouchCallout?: string;
    webkitUserSelect?: string;
  }

  interface HTMLMediaElement {
    referrerPolicy?: string;
  }
}

export {};
