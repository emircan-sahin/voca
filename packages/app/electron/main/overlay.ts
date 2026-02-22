import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { execSync, exec } from 'child_process';

let overlayWin: BrowserWindow | null = null;

const OVERLAY_HTML = /* html */ `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    -webkit-app-region: drag;
  }
  button { -webkit-app-region: no-drag; }

  .card {
    width: 320px;
    margin: 8px auto;
    padding: 16px;
    border-radius: 16px;
    background: rgba(17, 24, 39, 0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(55, 65, 81, 0.5);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pulse {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .title { font-size: 13px; font-weight: 600; color: #fff; }
  .timer {
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, monospace;
    color: #9ca3af;
  }

  .waveform-wrap {
    border-radius: 12px;
    background: rgba(31, 41, 55, 0.6);
    padding: 8px;
    margin-bottom: 12px;
  }
  canvas { width: 100%; height: 36px; display: block; }

  .info {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 14px;
  }
  .info svg { flex-shrink: 0; margin-top: 1px; }
  .info p { font-size: 11px; color: #6b7280; line-height: 1.5; }

  .stop-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px; height: 44px;
    border-radius: 50%;
    background: rgba(31, 41, 55, 1);
    border: 1px solid rgba(55, 65, 81, 0.5);
    cursor: pointer;
    margin: 0 auto;
    transition: background 0.15s;
  }
  .stop-btn:hover { background: rgba(55, 65, 81, 1); }
  .stop-icon {
    width: 16px; height: 16px;
    border-radius: 3px;
    background: #f97316;
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="header-left">
      <div class="pulse"></div>
      <span class="title">Recording</span>
    </div>
    <span class="timer" id="timer">00:00</span>
  </div>

  <div class="waveform-wrap">
    <canvas id="waveform"></canvas>
  </div>

  <div class="info">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
    <p>Your recording will be transcribed after processing</p>
  </div>

  <button class="stop-btn" id="stopBtn">
    <div class="stop-icon"></div>
  </button>
</div>

<script>
  const BAR_COUNT = 48;
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  const timerEl = document.getElementById('timer');

  // Timer
  const startTime = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent =
      String(Math.floor(s / 60)).padStart(2, '0') + ':' +
      String(s % 60).padStart(2, '0');
  }, 500);

  // Smooth animated waveform
  const currentHeights = new Float32Array(BAR_COUNT);
  const targetHeights  = new Float32Array(BAR_COUNT);
  let latestData = new Array(64).fill(0);
  const LERP = 0.18;

  window.electronAPI.onAudioData((data) => { latestData = data; });

  function animate() {
    requestAnimationFrame(animate);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const t = Date.now() / 1000;

    for (let i = 0; i < BAR_COUNT; i++) {
      const idx = Math.floor((i / BAR_COUNT) * latestData.length);
      const audioVal = (latestData[idx] || 0) / 255;

      // Idle wave: each bar oscillates with offset phase
      const idle = 0.08 + 0.06 * Math.sin(t * 2.5 + i * 0.4)
                        + 0.04 * Math.sin(t * 1.7 + i * 0.7);

      targetHeights[i] = Math.max(idle, audioVal);
      currentHeights[i] += (targetHeights[i] - currentHeights[i]) * LERP;
    }

    const gap  = 2;
    const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
    const cy   = h / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = Math.max(2, currentHeights[i] * h * 0.85);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(i * (barW + gap), cy - barH / 2, barW, barH, 1);
      ctx.fill();
    }
  }
  animate();

  // Stop button
  document.getElementById('stopBtn').addEventListener('click', () => {
    window.electronAPI.requestStopRecording();
  });
</script>
</body></html>`;

export function showOverlay(refocusPreviousApp: boolean, parentWin?: BrowserWindow) {
  if (overlayWin) return;

  // Capture the frontmost app before we create any window
  let previousApp = '';
  let previousPid = 0;
  if (refocusPreviousApp) {
    try {
      if (process.platform === 'darwin') {
        previousApp = execSync(
          `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`,
          { timeout: 500 }
        )
          .toString()
          .trim();
      } else {
        previousPid = parseInt(
          execSync(
            `powershell -Command "(Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow();' -Name W -Namespace N -PassThru)::GetForegroundWindow()}).Id"`,
            { timeout: 500 }
          )
            .toString()
            .trim(),
          10
        );
      }
    } catch {
      /* ignore */
    }
  }

  // Use the display where the main window is, falling back to primary
  const display = parentWin
    ? screen.getDisplayMatching(parentWin.getBounds())
    : screen.getPrimaryDisplay();
  const { workArea } = display;
  const width = 340;
  const height = 210;

  overlayWin = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + workArea.width / 2 - width / 2),
    y: workArea.y + 12,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWin.setAlwaysOnTop(true, 'floating');
  overlayWin.once('ready-to-show', () => {
    overlayWin?.showInactive();

    // Re-focus the app the user was in before overlay appeared
    if (process.platform === 'darwin') {
      if (previousApp && previousApp !== 'Electron') {
        const sanitized = previousApp.replace(/[^a-zA-Z0-9 .\-_]/g, '');
        if (sanitized) {
          setTimeout(() => {
            exec(`osascript -e 'tell application "${sanitized}" to activate'`);
          }, 150);
        }
      }
    } else {
      if (previousPid) {
        setTimeout(() => {
          exec(
            `powershell -Command "(New-Object -ComObject WScript.Shell).AppActivate(${previousPid})"`
          );
        }, 150);
      }
    }
  });
  overlayWin.on('closed', () => {
    overlayWin = null;
  });

  const htmlPath = join(app.getPath('temp'), 'voca-overlay.html');
  writeFileSync(htmlPath, OVERLAY_HTML);
  overlayWin.loadFile(htmlPath);
}

export function hideOverlay() {
  if (!overlayWin) return;
  overlayWin.close();
  overlayWin = null;
}

export function sendAudioDataToOverlay(data: number[]) {
  overlayWin?.webContents.send('overlay:audio-data', data);
}
