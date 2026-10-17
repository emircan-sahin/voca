# AI Lessons Learned

Mistakes caught during development. Review at the start of every session.

---

### [Dead Import] Unused import left after refactoring
- **Wrong**: Imported `TONES` in `auth.types.ts` but only used `TranslationTone` — `TONES` was never referenced
- **Right**: Only import what's actually used. After every edit, scan imports for unused symbols.
- **Why**: When moving enum references around, easy to import the constant AND the derived type when only one is needed.

### [Duplication] Same enum values hardcoded in types and schemas
- **Wrong**: `'pro' | 'max'` written in `BillingPlan` type, `userSchema`, and `activatePlanSchema` separately
- **Right**: Define once as `const BILLING_PLANS = ['pro', 'max'] as const`, derive type with `(typeof X)[number]`, use `z.enum(X)` in schemas
- **Why**: Copy-pasting enum values across files feels quick but creates multiple sources of truth that drift apart.

### [Type Safety] Interface fields wider than schema constraints
- **Wrong**: `IUserSettings.language: string` while schema enforces `z.enum(LANGUAGE_CODES)`
- **Right**: `IUserSettings.language: LanguageCode` — match the interface type to the schema constraint
- **Why**: When the interface was written first and the schema added later, nobody went back to tighten the interface.

### [Silent Failure] Empty catch blocks hide real errors
- **Wrong**: `.catch(() => {})` in `refreshUser()` and `useSettingsSync`
- **Right**: `.catch((err) => console.warn('[Context]', err.message ?? err))`
- **Why**: During rapid development, empty catch feels like "I'll handle this later" but it never gets revisited.

### [Unsafe Cast] Fragile `_id` type casting repeated everywhere
- **Wrong**: `(doc._id as unknown as { toString(): string }).toString()` in 5 different files
- **Right**: `doc._id.toString()` — Mongoose ObjectId has `toString()` natively
- **Why**: The first developer wasn't sure about the type, used a defensive cast, and everyone copied it.

### [Null Safety] Optional chaining doesn't protect property access after `?`
- **Wrong**: `{user?.name.charAt(0).toUpperCase()}` — if `user` is null, short-circuits to `undefined`, but if `user` exists with empty name, `.charAt(0)` returns `''`
- **Right**: Guard with `{user && user.name.charAt(0).toUpperCase()}` or full null check
- **Why**: `?.` only protects the left side. The right side still executes if left side is truthy.

### [Performance] Same function called 3x in JSX for the same result
- **Wrong**: `planBadgeStyle(user.plan)` called separately for `.bg`, `.text`, and `.label`
- **Right**: `const badge = planBadgeStyle(user.plan)` once, then use `badge.bg`, `badge.text`, `badge.label`
- **Why**: In JSX it's tempting to inline function calls in each attribute, forgetting they execute every render.

### [Stale Closure] IPC listener re-registered on every state change
- **Wrong**: `useEffect(() => window.electronAPI.onToggleRecording(callback), [callback])` — callback changes on every render
- **Right**: Use `useRef` to hold latest callback, register listener once with empty deps
- **Why**: When callback depends on state that changes frequently, the effect fires too often, causing listener churn.

### [React Context] useQueryClient outside QueryClientProvider
- **Wrong**: `useQueryClient()` in `useSettingsSync` which runs before `QueryClientProvider` in the tree — white screen
- **Right**: Extract `queryClient` to a module-level singleton (`~/lib/queryClient.ts`) and import directly
- **Why**: `useSettingsSync` is called in `App` component body, above `QueryClientProvider` in the JSX return. React hooks can't access context that wraps sibling JSX, only ancestor JSX.

### [Mongoose] findOneAndUpdate without $set replaces entire document
- **Wrong**: `findOneAndUpdate(filter, { email, name, avatarUrl, provider, providerId }, { upsert: true })` — on existing docs this replaces all fields, wiping `settings`, `credits`, `plan`, `refreshToken`
- **Right**: `findOneAndUpdate(filter, { $set: { email, name, avatarUrl }, $setOnInsert: { provider, providerId } }, { upsert: true })` — only updates specified fields, immutable fields set once on insert
- **Why**: Mongoose passes the update object directly to MongoDB. Without `$set`, MongoDB treats it as a full replacement. This silently destroys fields that aren't in the update object.

### [i18n] Translation context — feature names must be translated by meaning
- **Wrong**: "Planning" translated as "Planung" (DE), "Planificación" (ES), "計画" (JA) — all mean "project planning"
- **Right**: "Planning" means "list formatting" in this context → "Listenformat" (DE), "Formato de lista" (ES), "リスト整形" (JA)
- **Why**: AI translators default to the most common meaning of a word. Feature names need context-aware translation, not literal translation.

### [i18n] "Tone" in music/audio context vs writing style
- **Wrong**: "Ton" (DE), "Тон" (RU), "Ton" (TR) — all imply audio pitch or music tone
- **Right**: "Schreibstil" (DE), "Стиль" (RU), "Üslup" (TR) — writing style
- **Why**: In a transcription app, "Tone" controls the writing style (Developer/Personal), not audio characteristics.

### [i18n] Separate entry points need separate i18n imports
- **Wrong**: Only importing `~/i18n/config` in `main.tsx` — overlay window uses `useTranslation()` but i18n was never initialized there
- **Right**: Both `main.tsx` and `overlay.tsx` must import `~/i18n/config` independently
- **Why**: Electron overlay runs in its own BrowserWindow with a separate entry point. Each entry point starts fresh — shared config from another window is not inherited.

### [i18n] Tautological tooltips — "converts X to X"
- **Wrong**: JA `settings.numericTooltip` = "話した数字を数字に変換します" (converts spoken numbers to numbers)
- **Right**: "話した数字を算用数字に変換します" (converts spoken numbers to Arabic numerals/digits)
- **Why**: The tooltip must clarify the transformation — spoken words ("two hundred fifty") become digits (250). Saying "numbers to numbers" is meaningless.

### [Security] Token comparison must be timing-safe
- **Wrong**: `user.refreshToken !== hashToken(rt)` — strict equality leaks token length/content via response time differences
- **Right**: `crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(incoming))` with length check first
- **Why**: String `===` short-circuits on first differing byte. An attacker can measure response times to guess tokens byte-by-byte.

### [Security] exec() with interpolated strings → execFile() with args array
- **Wrong**: `` exec(`osascript -e 'tell application "${name}" to activate'`) `` — even with sanitization, shell interpretation is fragile
- **Right**: `execFile('osascript', ['-e', `tell application "${name}" to activate`])` — args bypass shell parsing
- **Why**: `exec()` spawns a shell that interprets the full command string. `execFile()` passes arguments directly to the process, eliminating shell injection vectors.

### [Security] Electron shell.openExternal needs URL protocol whitelist
- **Wrong**: `shell.openExternal(details.url)` — accepts any URL including `javascript:`, `file:`, `vbscript:`
- **Right**: Parse with `new URL(url).protocol`, only allow `['http:', 'https:', 'mailto:']`
- **Why**: `shell.openExternal` delegates to the OS. Dangerous schemes can execute code or access local files.

### [React] setTimeout in components must be cleaned up on unmount
- **Wrong**: `setTimeout(() => setCopied(false), 1500)` inline — no cleanup on unmount
- **Right**: Store timer in `useRef`, clear in `useEffect` cleanup: `return () => clearTimeout(ref.current)`
- **Why**: If the component unmounts before the timeout fires, React warns about state updates on unmounted components. In strict mode, this causes double-fire bugs.

### [Express] Async handler errors never reach errorMiddleware in Express 4
- **Wrong**: `router.get('/x', authenticate, controller)` with an `async` controller that throws — unhandled rejection, request hangs, process can crash
- **Right**: Wrap every async handler/middleware in `asyncHandler` (`~/utils/asyncHandler`) so rejections go to `next(err)`
- **Why**: Only Express 5 forwards rejected promises; the "async controllers can throw" assumption came from Express 5 docs.

### [Electron] alwaysOnTop windows don't show over other apps' fullscreen Spaces on macOS
- **Wrong**: `setAlwaysOnTop(true, 'floating')` alone — overlay invisible while the user is in a fullscreen app
- **Right**: macOS `type: 'panel'` + `setAlwaysOnTop(true, 'screen-saver')` + `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })`
- **Why**: A regular NSWindow can't join a fullscreen Space; without `skipTransformProcessType` Electron hides the Dock icon to make it work.

### [Zod] `z.coerce.boolean()` turns the string "false" into `true`
- **Wrong**: `PADDLE_SANDBOX: z.coerce.boolean()` and `numeric: z.coerce.boolean()` for env vars / query params — `Boolean('false') === true`, so `PADDLE_SANDBOX=false` still hit the sandbox
- **Right**: `z.enum(['true', 'false']).default('…').transform((v) => v === 'true')` for any string-sourced boolean
- **Why**: `coerce` reads like "parse", but it is plain JS truthiness; every non-empty string is truthy.

### [Edit] Trailing whitespace in an edit anchor gets dropped
- **Wrong**: Replaced `export const TranscriptModel = ` (trailing space) and the new text came out as `TranscriptModel =model<`
- **Right**: Anchor edits on whole tokens (`export const TranscriptModel = model<`), never on a string ending in whitespace
- **Why**: The edit tool trims trailing whitespace from the strings, so the space between `=` and `model` silently disappeared.

### [Workflow] Reverted another session's uncommitted work as "unrequested"
- **Wrong**: A subagent reported index.html hunks it didn't make; assumed it was lying and restored them to HEAD
- **Right**: Before reverting unexplained diffs, check file mtimes vs the agent's run window and `ListAgents` for other sessions in the same repo; ask if still unclear
- **Why**: A second Claude session was editing packages/web concurrently; the working tree isn't only yours

### [Express] A cleared cookie can come back as an empty value
- **Wrong**: `challengeCookie === undefined ? null : schema.safeParse(challengeCookie)` — a client replaying `voca_oauth_challenge=` (from `clearCookie`) failed the legacy no-PKCE login with 400
- **Right**: Treat an empty cookie like a missing one: `challengeCookie ? schema.safeParse(challengeCookie) : null`
- **Why**: `res.clearCookie` sends `name=; Expires=1970`; browsers drop it, but proxies/test clients may still send the empty pair, and `readCookie` returns `''`, not `undefined`

### [React Query] fetchNextPage/refetch never reject
- **Wrong**: `fetchNextPage().catch((err) => console.warn(...))` in `useTranscription` — the catch was dead code
- **Right**: Call it plainly; read failures from the query state (`error`, `isFetchNextPageError`). Only `throwOnError` makes it reject
- **Why**: Assumed it behaves like the raw `queryFn` promise; the observer swallows the rejection into query state

### [Native Input] Multi-character keyboard events get truncated
- **Wrong**: `voca-type` packed 20 UTF-16 units into one `CGEventKeyboardSetUnicodeString` event — xterm.js terminals and apps reading the DOM `key` kept only the first character of each event (`Bugün toplantıda…` → `Bulmğraöl`)
- **Right**: One code point per event (surrogate pairs together), and size the helper's timeout to the text length
- **Why**: TextEdit and plain textareas accept the whole string, so testing only there hides the bug

### [Native Input] `keystroke "v"` depends on the keyboard layout
- **Wrong**: `osascript ... keystroke "v" using command down` for auto-paste — on a layout with no V (Russian) it sends nothing, reports success, and the clipboard restore then wipes the transcript
- **Right**: Look up V's keycode in the active layout (ASCII-capable fallback) and press `key code N using command down`; a fixed `key code 9` would be Cmd+C on Turkish F
- **Why**: Only Latin layouts were ever tested
