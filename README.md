<p align="center">
  <img src="assets/voca_logo.png" alt="Voca Logo" width="128" />
</p>

<h1 align="center">Voca</h1>

<p align="center">
  AI-powered voice-to-text, right where you type.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey" alt="Platform" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

<p align="center">
  <img src="app_screenshot.png" alt="Voca App Screenshot" width="700" />
</p>

---

Press a shortcut, speak, and the transcript is automatically pasted wherever your cursor is. That's it.

**Stop paying $8/month for transcription apps.** Deepgram gives every new account **$200 in free credits** — that's essentially a lifetime of personal use. And since Voca is fully open-source, your audio never leaves your machine for any third party. You own your data.

## Why Voca?

- **Free forever (practically)** — $200 free Deepgram credits covers hundreds of hours of transcription. No subscriptions, no hidden fees.
- **Private by design** — 100% open-source. Audio is processed through your own API keys. No data collection, no analytics, no third-party servers storing your recordings.
- **Blazing fast & accurate** — Powered by Deepgram Nova-3, one of the best speech-to-text models available. Supports **35+ languages** with automatic language detection.
- **One-shortcut workflow** — Press a key, speak, done. The transcript lands right where your cursor was.
- **macOS & Windows** — Works on both platforms out of the box.

## How It Works

```
Press Right ⌘ (Mac) or Right ⊞ (Win)
        ↓
  Recording overlay appears
  (previous app stays focused)
        ↓
  Press shortcut again to stop
        ↓
  Audio → Deepgram Nova-3 / Groq Whisper
        ↓
  Transcript auto-pasted into your app
```

1. **Trigger** — Hit the global shortcut from anywhere. A small floating overlay confirms recording has started.
2. **Speak** — Talk naturally. The overlay shows a live waveform and timer.
3. **Stop** — Press the shortcut again (or click the stop button on the overlay).
4. **Done** — The transcript is copied to your clipboard and automatically pasted into whatever app you were using.

All transcripts are also saved locally in MongoDB so you can search and revisit them later.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 31 + electron-vite |
| Frontend | React 18, Tailwind CSS, Zustand, TanStack Query |
| Backend | Express.js, Mongoose, Multer |
| AI | Deepgram Nova-3, Groq Whisper Large v3 Turbo |
| Database | MongoDB |
| Language | TypeScript (monorepo with pnpm) |

## Project Structure

```
voca/
├── packages/
│   ├── shared/          # TypeScript types & Zod schemas (API contract)
│   ├── backend/         # Express API server (port 3100)
│   │   ├── controllers/ # Request handling & response mapping
│   │   ├── services/    # Deepgram & Groq transcription services
│   │   ├── models/      # Mongoose schemas
│   │   └── uploads/     # Temporary audio storage
│   └── app/             # Electron + React application
│       ├── electron/
│       │   ├── main/    # App lifecycle, shortcuts, overlay window
│       │   └── preload/ # Secure IPC bridge
│       └── src/
│           ├── pages/   # Dashboard, History, Settings & Setup views
│           ├── components/
│           ├── hooks/   # useRecorder, useGlobalShortcut, useRecordingOverlay
│           ├── stores/  # Zustand stores (provider, language, recording state)
│           └── services/# API calls via Axios
├── assets/              # Logo and static assets
├── .env.example
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **MongoDB** running locally (or a remote URI)
- **API Key** — at least one of:
  - [Deepgram](https://deepgram.com) — **$200 free credit** on signup (recommended)
  - [Groq](https://console.groq.com) — free tier available

### Installation

```bash
# Clone the repository
git clone https://github.com/emircansahin/voca.git
cd voca

# Install dependencies
pnpm install

# Configure environment
cp .env.example packages/backend/.env
```

Edit `packages/backend/.env` with your keys:

```env
PORT=3100
MONGODB_URI=mongodb://localhost:27017/voca
GROQ_API_KEY=your_groq_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### macOS — Grant Permissions First

Before launching the app on macOS, you need to grant **Accessibility** permission so the app can register global shortcuts and simulate paste. Run:

```bash
# This opens System Settings → Privacy & Security → Accessibility
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
```

Add your terminal (or the Electron app) to the allowed list. The app also has a built-in Setup screen that guides you through Microphone and Accessibility permissions on first launch.

### Run

```bash
# Start both backend & app
pnpm dev

# Or start individually
pnpm dev:backend   # Express API on port 3100
pnpm dev:app       # Electron app
```

### Build

```bash
pnpm build
```

## Supported Languages

Voca supports **35+ languages** with automatic detection. Some highlights:

English, Turkish, German, French, Spanish, Portuguese, Japanese, Korean, Chinese, Arabic, Russian, Italian, Dutch, Polish, Hindi, Swedish, Norwegian, Danish, Finnish, Czech, Thai, Vietnamese, and more.

Deepgram's Nova-3 model excels at multilingual detection — it can identify and transcribe the language automatically without any manual selection.

## Transcription Providers

| Provider | Model | Speed | Cost | Best For |
|----------|-------|-------|------|----------|
| **Deepgram** | Nova-3 | Very Fast | $0.0077/min | Accuracy, multilingual, smart formatting |
| **Groq** | Whisper Large v3 Turbo | Fast | $0.111/hr | Budget-friendly alternative |

You can switch between providers in the app at any time.

## Roadmap

- [ ] Verify Windows build and end-to-end functionality
- [x] Click-to-copy on transcript cards
- [ ] Relative timestamps ("20 minutes ago" instead of "22 Feb ...")
- [ ] Multi-language UI with localized content
- [ ] Rewrite recording overlay with React (currently plain HTML)
- [ ] Audio-reactive waveform visualization (bars respond to microphone input levels)

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork
   ```bash
   git clone https://github.com/<your-username>/voca.git
   cd voca
   ```
3. **Install** dependencies
   ```bash
   pnpm install
   cp .env.example packages/backend/.env  # add your API keys
   ```
4. **Create a branch** for your change
   ```bash
   git checkout -b feat/my-feature
   ```
5. **Run** the app in dev mode
   ```bash
   pnpm dev
   ```
6. **Commit** your changes, then **push** and open a **Pull Request**

A few things to keep in mind:

- Check the [Roadmap](#roadmap) for ideas on what to work on
- Open an issue first if you're planning a large change
- Keep PRs focused — one feature or fix per PR

## License

MIT
