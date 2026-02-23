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
