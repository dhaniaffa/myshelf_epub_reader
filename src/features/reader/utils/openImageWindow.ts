import type { ImageViewData } from '@/types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens an image in a dedicated standalone desktop popup window.
 * Returns true if the window opened successfully, or false if blocked.
 */
export function openImageInNewWindow(image: ImageViewData): boolean {
  try {
    // In Tauri desktop apps, window.open without Tauri WebviewWindow plugin crashes or terminates the app.
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      return false;
    }

    const screenW = typeof window !== 'undefined' ? window.screen.availWidth || 1280 : 1280;
    const screenH = typeof window !== 'undefined' ? window.screen.availHeight || 800 : 800;

    const width = Math.min(1100, Math.round(screenW * 0.85));
    const height = Math.min(850, Math.round(screenH * 0.85));
    const left = Math.round((screenW - width) / 2);
    const top = Math.round((screenH - height) / 2);

    const title = image.alt ? `MyShelf - ${image.alt}` : 'MyShelf - Penampil Gambar';

    const newWin = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
    );

    if (!newWin) {
      return false;
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #111318;
      color: #e2e2e6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    header {
      height: 50px;
      background: rgba(24, 26, 32, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      user-select: none;
      z-index: 10;
    }
    .title-box {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 55%;
      overflow: hidden;
    }
    .title {
      font-size: 13px;
      font-weight: 500;
      color: #c4c6d0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .controls {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    button {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e2e6;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s, transform 0.05s;
    }
    button:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }
    button:active {
      transform: scale(0.96);
    }
    .viewport {
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      position: relative;
    }
    .viewport.dragging {
      cursor: grabbing;
    }
    img {
      max-width: 95%;
      max-height: 95%;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      border-radius: 4px;
      transform-origin: center center;
    }
  </style>
</head>
<body>
  <header>
    <div class="title-box">
      <span class="title">${escapeHtml(image.alt || 'Gambar E-Book')}</span>
    </div>
    <div class="controls">
      <button id="zoomOut" title="Zoom Out (-)">-</button>
      <button id="reset" title="Reset Ukuran (0)">100%</button>
      <button id="zoomIn" title="Zoom In (+)">+</button>
      <button id="rotate" title="Putar 90 Derajat (R)">Putar 90°</button>
      <button id="close" style="margin-left: 8px; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4);" title="Tutup Jendela (Esc)">Tutup</button>
    </div>
  </header>
  <div class="viewport" id="viewport">
    <img id="img" src="${image.src}" alt="${escapeHtml(image.alt || '')}" draggable="false" />
  </div>
  <script>
    let scale = 1;
    let rotation = 0;
    let posX = 0;
    let posY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    const img = document.getElementById('img');
    const viewport = document.getElementById('viewport');

    function update() {
      img.style.transform = 'translate(' + posX + 'px, ' + posY + 'px) scale(' + scale + ') rotate(' + rotation + 'deg)';
      document.getElementById('reset').textContent = Math.round(scale * 100) + '%';
    }

    document.getElementById('zoomIn').onclick = () => { scale = Math.min(8, Math.round((scale + 0.25) * 100) / 100); update(); };
    document.getElementById('zoomOut').onclick = () => { scale = Math.max(0.2, Math.round((scale - 0.25) * 100) / 100); update(); };
    document.getElementById('rotate').onclick = () => { rotation = (rotation + 90) % 360; update(); };
    document.getElementById('reset').onclick = () => { scale = 1; rotation = 0; posX = 0; posY = 0; update(); };
    document.getElementById('close').onclick = () => { window.close(); };

    viewport.onwheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        scale = Math.min(8, Math.round((scale + 0.15) * 100) / 100);
      } else {
        scale = Math.max(0.2, Math.round((scale - 0.15) * 100) / 100);
      }
      update();
    };

    viewport.onmousedown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX - posX;
      startY = e.clientY - posY;
      viewport.classList.add('dragging');
    };

    window.onmousemove = (e) => {
      if (!isDragging) return;
      posX = e.clientX - startX;
      posY = e.clientY - startY;
      update();
    };

    window.onmouseup = () => {
      isDragging = false;
      viewport.classList.remove('dragging');
    };

    window.onkeydown = (e) => {
      if (e.key === '+' || e.key === '=') { scale = Math.min(8, Math.round((scale + 0.25) * 100) / 100); update(); }
      else if (e.key === '-') { scale = Math.max(0.2, Math.round((scale - 0.25) * 100) / 100); update(); }
      else if (e.key === '0') { scale = 1; rotation = 0; posX = 0; posY = 0; update(); }
      else if (e.key.toLowerCase() === 'r') { rotation = (rotation + 90) % 360; update(); }
      else if (e.key === 'Escape') { window.close(); }
    };
  </script>
</body>
</html>`;

    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();
    return true;
  } catch (err) {
    console.warn('Gagal membuka gambar di jendela baru:', err);
    return false;
  }
}
