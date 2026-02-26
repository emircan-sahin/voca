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
