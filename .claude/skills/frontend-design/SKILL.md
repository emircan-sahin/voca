# Skill: Frontend Design

## TailwindCSS Dark Tema Paleti

### Renkler
| Token | Class | Kullanım |
|-------|-------|---------|
| Background | `bg-gray-900` | Sayfa arka planı |
| Surface | `bg-gray-800` | Card, modal arka planı |
| Border | `border-gray-700` | Card border |
| Border hover | `border-gray-600` | Card hover state |
| Text primary | `text-gray-100` | Ana içerik |
| Text secondary | `text-gray-400` | Yardımcı metin |
| Text muted | `text-gray-600` | Placeholder, devre dışı |
| Accent | `bg-indigo-600` | Buton, link |
| Accent hover | `bg-indigo-700` | Buton hover |
| Danger | `bg-red-500` | Silme, kayıt aktif |
| Danger hover | `bg-red-600` | |

### Spacing
- Sayfa padding: `px-4 py-8`
- Max genişlik: `max-w-2xl mx-auto`
- Card padding: `p-4`
- Gap: `gap-3` (liste), `gap-4` (bölümler)

## RecordButton Tasarımı
```
┌─────────────────────────────┐
│  State: idle                │
│  ┌──────────┐               │
│  │  Mic 🎤  │ bg-indigo-600 │
│  └──────────┘               │
│                             │
│  State: recording           │
│  ┌──────────┐               │
│  │ Stop ■  │ bg-red-500    │
│  └──────────┘ animate-pulse │
│                             │
│  State: processing          │
│  ┌──────────┐               │
│  │ Spin ⟳  │ bg-gray-600   │
│  └──────────┘ cursor-not-allowed │
└─────────────────────────────┘
```

## TranscriptCard Tasarımı
```
┌────────────────────────────────────┐
│ Transkript metni burada görünür    │  text-gray-100 text-sm
│ ve birden fazla satıra yayılabilir │
│                                    │
│ 21 Şub 2025, 14:30 • 1:23 • TR   🗑 │  text-gray-400 text-xs
└────────────────────────────────────┘
```

## Yeni Komponent Kuralları
1. Props interface'i dosyanın üstünde tanımla
2. `clsx` kullan conditional class için
3. `lucide-react` ikonları kullan
4. Renk token'larından sapma — custom renkler yasak
5. Responsive: mobil-first (sm: / md: prefix)
