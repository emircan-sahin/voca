# Skill: Frontend Design

## Light Theme Palette

### Colors
| Token | Class | Usage |
|-------|-------|-------|
| Background | `bg-[#fafafa]` | Page background |
| Surface | `bg-white` | Cards, sidebar |
| Border | `border-neutral-200` | Card borders (solid) |
| Sidebar border | `border-dashed border-slate-300` | Sidebar & header dividers |
| Accent | `bg-red-600` | Recording active, primary action |
| Text primary | `text-neutral-900` | Main content |
| Text secondary | `text-neutral-500` | Helper text, metadata |
| Text muted | `text-neutral-400` | Placeholder, disabled |

### Spacing
- Page padding: `p-6`
- Card padding: `p-4`
- Gap: `gap-3` (list items), `gap-4` (sections)
- Window: Fixed 1050×740, non-resizable

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
- Sidebar uses **dashed** borders for structural dividers
- Cards use **solid** borders
- Navigation via Zustand store, no router

## RecordButton Design
```
┌─────────────────────────────┐
│  State: idle                │
│  ┌──────────┐               │
│  │  Mic     │ bg-red-600    │
│  └──────────┘               │
│                             │
│  State: recording           │
│  ┌──────────┐               │
│  │ Stop ■   │ bg-red-600    │
│  └──────────┘ animate-pulse │
│                             │
│  State: processing          │
│  ┌──────────┐               │
│  │ Spin     │ bg-neutral-400│
│  └──────────┘ cursor-not-allowed │
└─────────────────────────────┘
```

## TranscriptCard Design
```
┌────────────────────────────────────┐
│ Transcript text appears here       │  text-neutral-900 text-sm
│ and can span multiple lines        │
│                                    │
│ [Translated text if enabled]       │  text-neutral-600 text-sm
│                                    │
│ 20 minutes ago • 1:23 • TR      🗑 │  text-neutral-500 text-xs
└────────────────────────────────────┘
```
- Click-to-copy on transcript text
- Toggle between original and translated text
- Relative timestamps via dayjs

## Authentication UI
- **Unauthenticated**: Sidebar shows "Sign in with Google" button
- **Authenticated**: Sidebar shows user avatar + name, logout option
- Login opens system browser → Google OAuth → `voca://` deep link returns tokens
- Auth state persisted via `auth.store.ts` (Zustand + electron-store)

## Billing UI
- Plan cards: Pro ($3/mo) and Max ($10/mo)
- Active plan highlighted with accent border
- Remaining credits bar + expiry countdown
- 402 response → toast + auto-redirect to billing view

## Key Components

### ProviderSelect
Dropdown to switch between transcription providers.
- Options: `Groq Whisper` | `Deepgram Nova`
- Persisted in user settings via backend

### LanguageSelect
Dropdown to select transcription language.
- 35 language options from `LANGUAGE_CODES`
- Default: English
- Persisted in user settings via backend

## Axios Interceptor Behavior
| Status | Behavior |
|--------|----------|
| 401 | Auto-refresh JWT, queue concurrent requests, retry |
| 402 | Toast + redirect to billing view |
| 429 | Toast "Too many requests" |
| Other | Reject with `ApiError(message, data, status)` |

## New Component Rules
1. Define props interface at the top of the file
2. Use `clsx` for conditional classes
3. Use `lucide-react` icons
4. No deviation from color tokens — custom colors are forbidden
5. Use Poyraz UI components where applicable (atoms, molecules, organisms)
6. Dropdowns: consistent `w-64` width, short labels
