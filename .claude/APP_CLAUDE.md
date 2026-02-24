# App Rules — @voca/app (Electron + React)

## UI Kit — Poyraz UI
- **Docs**: https://ui.poyrazavsever.com
- **Repo**: https://github.com/poyrazavsever/poyraz-ui
- Atoms: `Button`, `Card`, `CardContent`, `Badge`, `Checkbox` → `import from 'poyraz-ui/atoms'`
- Molecules: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` → `import from 'poyraz-ui/molecules'`
- Organisms: `Sidebar`, `SidebarHeader`, `SidebarMenu`, `SidebarMenuItem`, `SidebarFooter` → `import from 'poyraz-ui/organisms'`
- **Tailwind v4 caveat**: Poyraz lives in `node_modules` which Tailwind v4 excludes from `@source`. Interactive-state classes (hover, focus, active) are safelisted via `@source inline(...)` in `globals.css`.

## App Layout
```
┌─────────────┬──────────────────────────────┐
│  Sidebar    │  TopHeader (mic select)      │
│  (profile)  ├──────────────────────────────│
│  Dashboard  │                              │
│  History    │     <Active View>            │
│  Settings   │                              │
│  Billing    │                              │
│ v0.0.1·macOS│                              │
│  ─────────  │                              │
│  User info  │                              │
└─────────────┴──────────────────────────────┘
```
- **Navigation**: Zustand store (`navigation.store.ts`), no router — conditional rendering
- **Recording hook** (`useTranscription`) lives in `DashboardLayout` so recording persists across view switches
- **Window**: Fixed 1050×740, non-resizable

## Authentication
- Google OAuth opens system browser → `voca://auth/callback` deep link returns tokens
- `auth.store.ts` (Zustand + electron-store persistence) holds `user`, `token`, `refreshToken`
- Sidebar shows login button (unauthenticated) or user profile avatar + name (authenticated)
- `onAuthCallback` IPC listener in preload receives deep link tokens

## Axios Interceptors
The interceptor chain in `~/lib/axios.ts` handles:
| Status | Behavior |
|--------|----------|
| 401 | Auto-refresh token via `/auth/refresh`, queue concurrent requests, retry original |
| 402 | Toast error + redirect to billing view |
| 429 | Toast error ("Too many requests") |
| Other | Reject with `ApiError(message, data, status)` |

Interceptor skips refresh for `/auth/refresh` and `/auth/google*` to avoid loops.

## Design Tokens (light theme)
| Token | Value | Usage |
|-------|-------|-------|
| Background | `#fafafa` | Page background |
| Surface | `#ffffff` | Cards, sidebar |
| Border | `#e5e5e5` | Card borders (solid) |
| Sidebar border | `border-dashed border-slate-300` | Sidebar & header dividers |
| Accent | `#dc2626` | Red accent (recording) |
| Text | `#171717` | Primary text |
| Muted | `#737373` | Secondary text |

## Electron Preload
Expose only safe APIs via `contextBridge`:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  updater: { checkForUpdates, downloadUpdate, installUpdate, onUpdateAvailable, onDownloadProgress, onUpdateDownloaded },
  // Only add what's necessary
});
```
`nodeIntegration: false` and `contextIsolation: true` are mandatory.
`voca://` protocol handler registered in main process (dev: plist patch, prod: app bundle).

## Auto-Update (electron-updater)
- `updater.ts` in main process — `autoDownload: false`, user confirms via toast
- IPC channels: `updater:check`, `updater:download`, `updater:install` + renderer events
- Dev mode registers noop handlers (no crash on sidebar click)
- Checks: 5s after launch, then every 4h
- `useAutoUpdate` hook in renderer shows 3-stage toast (available → downloading → restart)
- Sidebar version label is clickable → triggers manual check
- Packaging: `electron-builder` with `npmRebuild: false` (uiohook-napi uses prebuilt binaries)
- CI: `.github/workflows/release.yml` — tag push `v*` → build mac+win → publish to GitHub Release

## MediaRecorder
- Format: `audio/webm`
- Noise suppression: `getUserMedia({ audio: { noiseSuppression } })` — controlled by `noiseSuppression.store.ts`, synced to backend
- Privacy mode: `privacyMode.store.ts` — same toggle pattern as noise suppression, synced to backend. When active, `useSettingsSync` invalidates `['transcripts']` query after settings save.
- Stop stream tracks after stopping: `stream.getTracks().forEach(t => t.stop())`
- Create blob: `new Blob(chunks, { type: 'audio/webm' })`

## Sending FormData with axios
```typescript
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
// Content-Type header is set automatically — do NOT set it manually!
const res = await axiosInstance.post('/transcripts', formData);
```

## React Query Usage
- `queryClient` singleton lives in `~/lib/queryClient.ts` — import it directly when needed outside React tree (stores, hooks called above `QueryClientProvider`)
- Use `useMutation<ApiResponse<T>, ApiError, TVar>` for mutations
- Use `useQuery<ApiResponse<T>>` for queries
- Access response: `res.message`, `res.data`
- Access error: `err.message`, `err.data` (structured validation errors)
- Refresh the list after mutation with `queryClient.invalidateQueries`

## Toast Notifications
Toast calls belong in hooks/components — **not** in the interceptor (exception: 402 and 429 are handled in interceptor for global UX consistency):
```typescript
onSuccess: (res) => toast.success(res.message),
onError: (err: ApiError) => toast.error(err.message),
```
- Success: use `res.message` from `ApiResponse<T>`
- Error: use `err.message` from `ApiError`, access `err.data` for structured validation errors
- Show toasts selectively — not every request needs a toast
- Hardcoded messages are **forbidden** (exception: client-only toasts like "Copied to clipboard")

## RecordButton States
| State | Appearance |
|-------|------------|
| idle | Red background, Mic icon |
| recording | Red + pulse animation, Square icon |
| processing | Gray, Loader2 spin icon, disabled |

## Import Rules
- `~/` alias is mandatory, relative imports (`../../`) are **forbidden**
- `fetch()` is **forbidden** — use `api` from `~/lib/axios`
- dayjs: `import dayjs from '~/lib/dayjs'` (plugins pre-loaded)
- axios: `import { api } from '~/lib/axios'`
- Shared: `import { ITranscript, IUser } from '@voca/shared'`

## Service Files
- `try-catch` is **forbidden** — the axios interceptor catches errors via `Promise.reject`
- Return type: `Promise<T>` (interceptor unwraps `ApiResponse<T>` automatically)
- Use `api.get`, `api.post`, `api.delete` — not `axiosInstance` directly

## Frontend Code Quality

### IPC Listener Hooks
Use `useRef` pattern to prevent listener re-registration on every state change:
```typescript
// Wrong — re-registers on every callback change
useEffect(() => {
  return window.electronAPI.onToggleRecording(callback);
}, [callback]);

// Right — stable listener, always calls latest callback
const callbackRef = useRef(callback);
callbackRef.current = callback;
useEffect(() => {
  return window.electronAPI.onToggleRecording(() => callbackRef.current());
}, []);
```

### Null Safety in JSX
Always guard against null user/data before accessing properties:
```typescript
// Wrong — crashes if user is null
{user?.name.charAt(0).toUpperCase()}

// Right — guard with && or ternary
{user && user.name.charAt(0).toUpperCase()}
```

### No Redundant Calculations in JSX
Cache function results when called multiple times:
```typescript
// Wrong — called 3 times
style={{ bg: planBadge(user.plan).bg, color: planBadge(user.plan).text }}>
  {planBadge(user.plan).label}

// Right — called once
const badge = planBadge(user.plan);
style={{ bg: badge.bg, color: badge.text }}>{badge.label}
```

### No Silent Catch
Always log errors with context:
```typescript
// Wrong
.catch(() => {});

// Right
.catch((err) => console.warn('[Context]', err.message ?? err));
```

### Shell Command Safety (Electron)
When executing shell commands from user-derived input:
- Sanitize with strict character whitelist
- Add length limits
- Add execution timeout
- Always provide error callback to `exec()`
