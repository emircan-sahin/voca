# App Rules — @voca/app (Electron + React)

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
- Use `useMutation` for transcription
- Use `useQuery({ queryKey: ['transcripts'] })` for the list
- Get success/error messages from the API: `res.message`
- Refresh the list after mutation with `queryClient.invalidateQueries`

## Toast Notifications
Use the `message` field returned from the API:
```typescript
onSuccess: (res) => toast.success(res.message),
onError: (err: { message: string }) => toast.error(err.message),
```
Hardcoded messages are **forbidden**.

## TailwindCSS Design Tokens
Color palette (dark theme):
- Background: `bg-gray-900`
- Card: `bg-gray-800` + `border-gray-700`
- Text primary: `text-gray-100`
- Text secondary: `text-gray-400`
- Text muted: `text-gray-600`
- Accent: `indigo-600` (hover: `indigo-700`)
- Danger: `red-500` (hover: `red-600`)

## RecordButton States
| State | Appearance |
|-------|------------|
| idle | Indigo background, Mic icon |
| recording | Red + pulse animation, Square icon |
| processing | Gray, Loader2 spin icon, disabled |

## Import Rules
- `~/` alias is mandatory, `../../` is forbidden
- dayjs: `import dayjs from '~/lib/dayjs'`
- axios: `import axiosInstance from '~/lib/axios'`
- Shared: `import { ITranscript } from '@voca/shared'`

## Service Files
- `try-catch` is **forbidden** — the axios interceptor catches errors via `Promise.reject`
- Return type: `Promise<ApiResponse<T>>`
