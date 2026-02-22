# Skill: Frontend Design

## TailwindCSS Dark Theme Palette

### Colors
| Token | Class | Usage |
|-------|-------|-------|
| Background | `bg-gray-900` | Page background |
| Surface | `bg-gray-800` | Card, modal background |
| Border | `border-gray-700` | Card border |
| Border hover | `border-gray-600` | Card hover state |
| Text primary | `text-gray-100` | Main content |
| Text secondary | `text-gray-400` | Helper text |
| Text muted | `text-gray-600` | Placeholder, disabled |
| Accent | `bg-indigo-600` | Button, link |
| Accent hover | `bg-indigo-700` | Button hover |
| Danger | `bg-red-500` | Delete, recording active |
| Danger hover | `bg-red-600` | |

### Spacing
- Page padding: `px-4 py-8`
- Max width: `max-w-2xl mx-auto`
- Card padding: `p-4`
- Gap: `gap-3` (list), `gap-4` (sections)

## RecordButton Design
```
┌─────────────────────────────┐
│  State: idle                │
│  ┌──────────┐               │
│  │  Mic     │ bg-indigo-600 │
│  └──────────┘               │
│                             │
│  State: recording           │
│  ┌──────────┐               │
│  │ Stop ■   │ bg-red-500    │
│  └──────────┘ animate-pulse │
│                             │
│  State: processing          │
│  ┌──────────┐               │
│  │ Spin     │ bg-gray-600   │
│  └──────────┘ cursor-not-allowed │
└─────────────────────────────┘
```

## TranscriptCard Design
```
┌────────────────────────────────────┐
│ Transcript text appears here       │  text-gray-100 text-sm
│ and can span multiple lines        │
│                                    │
│ 21 Feb 2025, 14:30 • 1:23 • TR  🗑 │  text-gray-400 text-xs
└────────────────────────────────────┘
```

## Key Components

### ProviderSelect
Dropdown to switch between transcription providers. Uses `useProviderStore` (Zustand) to persist selection.
- Options: `Groq Whisper` (whisper-large-v3-turbo) | `Deepgram Nova` (nova-3)
- Displayed as a compact `<select>` styled with gray-800 surface tokens

### LanguageSelect
Dropdown to select transcription language. Uses `useLanguageStore` (Zustand) to persist selection.
- 35+ language options (en, tr, de, fr, es, ...)
- Default: English
- Language code passed as query param to backend

### ShortcutsPanel
Fixed bottom-right button that opens a keyboard shortcuts overlay.
- Toggle with `?` key or click
- Close with `Escape`
- Platform-aware: shows `Right ⌘` on macOS, `Right ⊞` on Windows via `window.electronAPI.platform`

## New Component Rules
1. Define props interface at the top of the file
2. Use `clsx` for conditional classes
3. Use `lucide-react` icons
4. No deviation from color tokens — custom colors are forbidden
5. Responsive: mobile-first (sm: / md: prefix)
