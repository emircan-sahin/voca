# App Rules — @voca/app (Electron + React)

## UI Kit — Poyraz UI
- **Docs**: https://ui.poyrazavsever.com
- **Repo**: https://github.com/poyrazavsever/poyraz-ui
- Atoms: `Button`, `Card`, `CardContent`, `Badge` → `import from 'poyraz-ui/atoms'`
- Molecules: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` → `import from 'poyraz-ui/molecules'`
- Organisms: `Sidebar`, `SidebarHeader`, `SidebarMenu`, `SidebarMenuItem`, `SidebarFooter` → `import from 'poyraz-ui/organisms'`
- **Tailwind v4 caveat**: Poyraz lives in `node_modules` which Tailwind v4 excludes from `@source`. Interactive-state classes (hover, focus, active) are safelisted via `@source inline(...)` in `globals.css`.

## App Layout
```
┌─────────────┬──────────────────────────────┐
│  Sidebar    │  TopHeader (mic select)      │
│             ├──────────────────────────────│
│  Dashboard  │                              │
│  History    │     <Active View>            │
│  Settings   │                              │
│             │                              │
│  ─────────  │                              │
│  Voca v0.1  │                              │
└─────────────┴──────────────────────────────┘
```
- **Navigation**: Zustand store (`navigation.store.ts`), no router — conditional rendering
- **Recording hook** (`useTranscription`) lives in `DashboardLayout` so recording persists across view switches
- **Window**: Fixed 1050×740, non-resizable

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
  // Only add what's necessary
});
```
`nodeIntegration: false` and `contextIsolation: true` are mandatory.

## MediaRecorder
- Format: `audio/webm`
- Request mic permission with `getUserMedia({ audio: true })`
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
- Use `useMutation<ApiResponse<T>, ApiError, TVar>` for mutations
- Use `useQuery<ApiResponse<T>>` for queries
- Access response: `res.message`, `res.data`
- Access error: `err.message`, `err.data` (structured validation errors)
- Refresh the list after mutation with `queryClient.invalidateQueries`

## Toast Notifications
Toast calls belong in hooks/components — **not** in the interceptor:
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
- `~/` alias is mandatory, `../../` is forbidden
- dayjs: `import dayjs from '~/lib/dayjs'`
- axios: `import { api } from '~/lib/axios'`
- Shared: `import { ITranscript } from '@voca/shared'`

## Service Files
- `try-catch` is **forbidden** — the axios interceptor catches errors via `Promise.reject`
- Return type: `Promise<T>` (interceptor unwraps `ApiResponse<T>` automatically)
- Use `api.get`, `api.post`, `api.delete` — not `axiosInstance` directly
