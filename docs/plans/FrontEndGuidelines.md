# FrontEndGuidelines.md — DOJO (Project Sekigahara)

## 1. Design Direction

### 1.1 Aesthetic: Wabi-Sabi Digital Dojo

The visual language evokes a serene Japanese training hall — imperfect textures, warm neutrals, and deliberate restraint. The design should feel calm, focused, and rewarding. Think: ink on aged paper, wooden floors, morning light through shoji screens.

**References**: Traditional dojo interiors, Japanese calligraphy, wabi-sabi pottery, Muji design language.

### 1.2 Core Palette

| Token                    | Light Mode                 | Dark Mode                    | Usage                      |
| ------------------------ | -------------------------- | ---------------------------- | -------------------------- |
| `--background`           | `#F5F0E8` (warm parchment) | `#1C1917` (charcoal)         | Page background            |
| `--foreground`           | `#2C2C2C` (sumi ink)       | `#F5F0E8` (warm parchment)   | Primary text               |
| `--card`                 | `#FEFCF6` (soft white)     | `#292524` (dark stone)       | Card surfaces              |
| `--card-foreground`      | `#2C2C2C`                  | `#F5F0E8`                    | Card text                  |
| `--primary`              | `#B33030` (vermilion)      | `#D94040` (bright vermilion) | CTA buttons, active states |
| `--primary-foreground`   | `#FFFFFF`                  | `#FFFFFF`                    | Text on primary            |
| `--secondary`            | `#D4C5A9` (tatami)         | `#44403C` (warm gray)        | Secondary surfaces         |
| `--secondary-foreground` | `#2C2C2C`                  | `#E7E5E4`                    | Text on secondary          |
| `--muted`                | `#E8E0D0` (aged paper)     | `#3A3633` (shadow)           | Muted backgrounds          |
| `--muted-foreground`     | `#78716C` (stone)          | `#A8A29E` (light stone)      | Muted text                 |
| `--accent`               | `#C4956A` (gold/amber)     | `#C4956A`                    | Streak highlights, badges  |
| `--destructive`          | `#DC2626`                  | `#EF4444`                    | Error states               |
| `--border`               | `#D6CFC0` (soft edge)      | `#3D3835`                    | Borders                    |
| `--ring`                 | `#B33030`                  | `#D94040`                    | Focus rings                |

### 1.3 Typography

| Role      | Font           | Weight   | Fallback                         |
| --------- | -------------- | -------- | -------------------------------- |
| Headings  | Noto Serif JP  | 500, 700 | Playfair Display, Georgia, serif |
| Body      | DM Sans        | 400, 500 | Inter, system-ui, sans-serif     |
| Monospace | JetBrains Mono | 400      | ui-monospace, monospace          |

Load via Google Fonts. Noto Serif JP supports both English and Japanese glyphs.

### 1.4 Spacing & Layout

- Max content width: `48rem` (768px) — mobile-first, single column.
- Consistent spacing scale via Tailwind defaults (4px base).
- Generous vertical whitespace between sections.
- Cards are the primary content container.

---

## 2. shadcn/ui Setup

### 2.1 Installation

Follow the Vite + React setup from the shadcn/ui docs. Use the CLI:

```zsh
npx shadcn@latest init
```

**Config choices**:

- Style: Default
- Base color: Slate (we override with custom palette)
- CSS variables: Yes
- Tailwind CSS: Yes
- Components directory: `src/components/ui`
- Utilities: `src/lib/utils.js`

### 2.2 Required Components

Install these shadcn/ui components:

```zsh
npx shadcn@latest add button card badge dialog toast separator skeleton
npx shadcn@latest add dropdown-menu sheet tabs progress avatar tooltip
```

### 2.3 CSS Variables Setup

In `src/index.css`, define the theme using CSS custom properties. shadcn/ui reads these automatically.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode — Wabi-sabi parchment */
    --background: 37 33% 93%; /* #F5F0E8 */
    --foreground: 0 0% 17%; /* #2C2C2C */
    --card: 40 50% 98%; /* #FEFCF6 */
    --card-foreground: 0 0% 17%;
    --popover: 40 50% 98%;
    --popover-foreground: 0 0% 17%;
    --primary: 0 58% 44%; /* #B33030 */
    --primary-foreground: 0 0% 100%;
    --secondary: 37 26% 75%; /* #D4C5A9 */
    --secondary-foreground: 0 0% 17%;
    --muted: 34 22% 86%; /* #E8E0D0 */
    --muted-foreground: 25 5% 46%; /* #78716C */
    --accent: 28 42% 59%; /* #C4956A */
    --accent-foreground: 0 0% 17%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 34 17% 80%; /* #D6CFC0 */
    --input: 34 17% 80%;
    --ring: 0 58% 44%;
    --radius: 0.5rem;
  }

  .dark {
    /* Dark mode — Charcoal dojo */
    --background: 20 10% 9%; /* #1C1917 */
    --foreground: 37 33% 93%; /* #F5F0E8 */
    --card: 20 8% 15%; /* #292524 */
    --card-foreground: 37 33% 93%;
    --popover: 20 8% 15%;
    --popover-foreground: 37 33% 93%;
    --primary: 0 62% 55%; /* #D94040 */
    --primary-foreground: 0 0% 100%;
    --secondary: 20 5% 26%; /* #44403C */
    --secondary-foreground: 25 6% 90%;
    --muted: 20 6% 21%; /* #3A3633 */
    --muted-foreground: 25 5% 64%; /* #A8A29E */
    --accent: 28 42% 59%; /* #C4956A */
    --accent-foreground: 37 33% 93%;
    --destructive: 0 72% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 20 6% 23%; /* #3D3835 */
    --input: 20 6% 23%;
    --ring: 0 62% 55%;
  }
}
```

### 2.4 Dark Mode Toggle

Use a `ThemeProvider` context that toggles the `dark` class on `<html>`:

```javascript
// src/components/layout/ThemeProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children, defaultTheme = "system" }) => {
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

Toggle button in the header using a shadcn `Button` with sun/moon icon.

---

## 3. Component Guidelines

### 3.1 Naming & Organization

```zsh
src/components/
├── layout/
│   ├── Header.jsx           # Logo, nav, wallet button, theme toggle
│   ├── Footer.jsx           # Links, copyright
│   └── PageWrapper.jsx      # Max-width container, padding
├── dojo/
│   ├── CheckInButton.jsx    # Hero CTA — the main action
│   ├── StreakDisplay.jsx     # Current streak, longest streak, tier
│   ├── StreakFire.jsx        # Animated fire/flame visual
│   ├── TierBadge.jsx        # Belt color badge
│   ├── ClaimCard.jsx        # Weekly reward claim UI
│   ├── CountdownTimer.jsx   # Time until next check-in
│   └── CheckInHistory.jsx   # Past check-in log (from EAS events)
├── swap/
│   ├── SwapPanel.jsx        # Buy/sell $DOJO
│   └── PriceDisplay.jsx     # Current bonding curve price
└── ui/                      # shadcn/ui generated — do not manually edit
```

### 3.2 Component Structure

Every component follows this pattern:

```javascript
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StreakDisplay = ({ address }) => {
  const { t } = useTranslation();

  // TanStack Query hooks for data
  // ...

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("streak.title")}</CardTitle>
      </CardHeader>
      <CardContent>{/* ... */}</CardContent>
    </Card>
  );
};
```

Key rules:

- Import `useTranslation` in every component with user-facing text.
- Use shadcn/ui primitives (`Card`, `Button`, `Badge`, etc.) — don't reinvent.
- Tailwind classes only. No inline styles.
- Data via hooks (TanStack Query wrappers), never fetched inside components.

### 3.3 The Check-In Button (Hero Element)

The check-in button is the single most important UI element. It should be:

- Large, centered, visually dominant.
- Three states: **Ready** (pulsing vermilion), **Pending** (loading spinner), **Done** (muted, "Checked In" with checkmark).
- Disabled after successful check-in for the day.
- Surrounded by the streak counter and tier badge.

```text
┌─────────────────────────────┐
│         Current Streak      │
│           🔥14 Days         │
│        ┌───────────┐        │
│        │  CHECK IN │        │  ← Hero button
│        └───────────┘        │
│     Purple Belt · Journeyman│
│  Next check-in in: 4h 23m   │
└─────────────────────────────┘
```

### 3.4 Loading States

Use shadcn's `Skeleton` component for all loading states. Never show blank areas or spinners without context.

```javascript
import { Skeleton } from "@/components/ui/skeleton";

// While streak data loads
<Skeleton className="h-12 w-24" />;
```

### 3.5 Toast Notifications

Use shadcn's `toast` for transaction feedback:

- Check-in pending: `toast({ title: t('toast.checkinPending') })`
- Check-in success: `toast({ title: t('toast.checkinSuccess'), description: t('toast.streakUpdated', { count: streak }) })`
- Check-in failed (duplicate): `toast({ title: t('toast.checkinFailed'), variant: 'destructive' })`
- Claim success: `toast({ title: t('toast.claimSuccess') })`

---

## 4. Internationalization (i18n)

### 4.1 Setup

```zsh
npm install react-i18next i18next i18next-browser-languagedetector
```

```javascript
// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      kr: { translation: kr },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
```

Import in `main.jsx` before `App`:

```javascript
import "./i18n";
```

### 4.2 Translation File Structure

```json
// src/i18n/locales/en.json
{
  "app": {
    "name": "DOJO",
    "tagline": "Daily Practice. Onchain."
  },
  "nav": {
    "home": "Home",
    "swap": "Swap",
    "about": "About"
  },
  "wallet": {
    "connect": "Connect Wallet",
    "disconnect": "Disconnect",
    "wrongNetwork": "Switch to Base"
  },
  "checkin": {
    "button": "Check In",
    "buttonDone": "Checked In",
    "buttonPending": "Checking In..."
  },
  "streak": {
    "title": "Your Streak",
    "current": "Current Streak",
    "longest": "Personal Best",
    "days": "{{count}} day",
    "days_plural": "{{count}} days",
    "atRisk": "Check in today to keep your streak!",
    "nextCheckin": "Next check-in in {{time}}"
  },
  "tier": {
    "beginner": "Beginner",
    "apprentice": "Apprentice",
    "journeyman": "Journeyman",
    "master": "Master",
    "belt": "{{tier}} Belt"
  },
  "rewards": {
    "title": "Weekly Rewards",
    "claimable": "{{amount}} $DOJO available",
    "claim": "Claim Rewards",
    "claimed": "Claimed",
    "noClaim": "No rewards this week",
    "tierEarned": "Earned as {{tier}}"
  },
  "swap": {
    "title": "Swap",
    "buy": "Buy $DOJO",
    "sell": "Sell $DOJO",
    "price": "Current Price",
    "amount": "Amount"
  },
  "toast": {
    "checkinPending": "Checking in...",
    "checkinSuccess": "Checked in!",
    "checkinFailed": "Check-in failed",
    "checkinDuplicate": "Already checked in today",
    "streakUpdated": "Streak: {{count}} days",
    "claimPending": "Claiming rewards...",
    "claimSuccess": "Rewards claimed!",
    "claimFailed": "Claim failed"
  },
  "errors": {
    "walletNotConnected": "Please connect your wallet",
    "transactionFailed": "Transaction failed",
    "networkError": "Network error. Please try again."
  },
  "footer": {
    "builtOn": "Built on Base",
    "poweredBy": "Powered by Sekigahara"
  }
}
```

```json
// src/i18n/locales/ja.json
{
  "app": {
    "name": "道場",
    "tagline": "日々の修行。オンチェーンで。"
  },
  "nav": {
    "home": "ホーム",
    "swap": "スワップ",
    "about": "概要"
  },
  "wallet": {
    "connect": "ウォレット接続",
    "disconnect": "切断",
    "wrongNetwork": "Baseに切替"
  },
  "checkin": {
    "button": "チェックイン",
    "buttonDone": "チェックイン済み",
    "buttonPending": "チェックイン中..."
  },
  "streak": {
    "title": "ストリーク",
    "current": "連続記録",
    "longest": "自己ベスト",
    "days": "{{count}}日",
    "days_plural": "{{count}}日",
    "atRisk": "今日チェックインしてストリークを守ろう！",
    "nextCheckin": "次のチェックインまで{{time}}"
  },
  "tier": {
    "beginner": "白帯",
    "apprentice": "青帯",
    "journeyman": "紫帯",
    "master": "黒帯",
    "belt": "{{tier}}"
  },
  "rewards": {
    "title": "週間報酬",
    "claimable": "{{amount}} $DOJO 獲得可能",
    "claim": "報酬を受取",
    "claimed": "受取済み",
    "noClaim": "今週の報酬はありません",
    "tierEarned": "{{tier}}として獲得"
  },
  "swap": {
    "title": "スワップ",
    "buy": "$DOJO を購入",
    "sell": "$DOJO を売却",
    "price": "現在価格",
    "amount": "数量"
  },
  "toast": {
    "checkinPending": "チェックイン中...",
    "checkinSuccess": "チェックイン完了！",
    "checkinFailed": "チェックイン失敗",
    "checkinDuplicate": "本日はチェックイン済みです",
    "streakUpdated": "ストリーク: {{count}}日",
    "claimPending": "報酬を受取中...",
    "claimSuccess": "報酬を受取りました！",
    "claimFailed": "受取に失敗しました"
  },
  "errors": {
    "walletNotConnected": "ウォレットを接続してください",
    "transactionFailed": "トランザクション失敗",
    "networkError": "ネットワークエラー。再試行してください。"
  },
  "footer": {
    "builtOn": "Base上に構築",
    "poweredBy": "Sekigahara提供"
  }
}
```

### 4.3 i18n Rules

1. **Every user-facing string** uses `t('key')`. No exceptions.
2. **Pluralization**: Use `_plural` suffix or `count` interpolation per i18next docs.
3. **Interpolation**: `{{variable}}` syntax for dynamic values.
4. **Namespacing**: Flat namespace with dot-separated keys grouped by feature area.
5. **Language switcher**: Dropdown in footer or header. Persist choice to localStorage.
6. **New strings**: Add to `en.json`, `ja.json` and `kr.json` simultaneously.

---

## 5. Responsive Design

### 5.1 Breakpoints

Follow Tailwind defaults. Design mobile-first:

| Breakpoint | Width    | Layout                                |
| ---------- | -------- | ------------------------------------- |
| Default    | < 640px  | Single column, full-width cards       |
| `sm`       | ≥ 640px  | Minor spacing adjustments             |
| `md`       | ≥ 768px  | Max-width container, wider cards      |
| `lg`       | ≥ 1024px | Optional two-column for swap + streak |

### 5.2 Mobile Priorities

- Check-in button must be thumb-reachable (bottom of viewport or center).
- Streak display always visible without scrolling.
- Wallet connection in header, always accessible.
- Swap panel is a secondary view (separate tab/page on mobile).

---

## 6. Animation Guidelines

### 6.1 Principles

- Animations are subtle and purposeful. No gratuitous motion.
- Respect `prefers-reduced-motion`. Disable animations for users who opt out.
- Use CSS transitions for state changes, Framer Motion only if complex choreography is needed.

### 6.2 Specific Animations

| Element         | Animation                     | Trigger                     |
| --------------- | ----------------------------- | --------------------------- |
| Check-in button | Gentle pulse (scale 1.0→1.02) | When ready to check in      |
| Streak counter  | Number roll-up                | After successful check-in   |
| Fire/flame icon | Flickering CSS animation      | Always (scales with streak) |
| Tier badge      | Shimmer on tier-up            | When tier changes           |
| Toast           | Slide in from top             | On tx events                |
| Cards           | Fade in + slight Y translate  | On mount                    |

### 6.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Juice

"Juice" is seemingly unnecessary animation that improves feedback and makes the app feel alive. These are small touches that don't change functionality but dramatically improve perceived quality.

### 7.1 Library

We use `motion` (Framer Motion) for juice animations. Shared helpers live in `src/lib/motion.js`.

### 7.2 Patterns

| Pattern | Where Used | How |
| --- | --- | --- |
| **Staggered entrance** | HomePage cards/sections | `fadeInUp` + `staggerDelay(index)` — each element fades in 80ms after the previous |
| **Spring tap** | CheckInButton | `whileTap: { scale: 0.97 }` — subtle press feedback |
| **Sliding tab indicator** | SwapPage token tabs, buy/sell tabs | `motion.span` with `layoutId` — background slides between active tabs |
| **Tab content crossfade** | SwapPage | `AnimatePresence mode="wait"` — content fades out left, fades in right on tab switch |
| **Spring pop-in** | Farcaster share button | `initial: { scale: 0.8 }` → `animate: { scale: 1 }` with spring physics |
| **Bounce alert** | Streak at-risk warning | Spring entrance draws attention to the urgency |
| **Page fade** | PageWrapper | Soft opacity fade on route entry |

### 7.3 Numeric Typography

- All numeric values (prices, amounts, counts, timers) use `font-mono tabular-nums` for alignment and readability
- Use `@number-flow/react` (`NumberFlow`) for animated number transitions on values that update in place
- Wrap only the number in `font-mono` — ticker symbols ($DOJO, $SEKI, ETH) and labels use the default body font
- Example: `<span className="font-mono tabular-nums"><NumberFlow value={price} format={fmt} /></span> $DOJO`

### 7.4 Rules

- All juice respects `prefers-reduced-motion` (motion library handles this automatically)
- Keep durations under 400ms — juice should feel snappy, not sluggish
- Springs > easing curves for interactive elements (more natural feel)
- Use `layoutId` for sliding indicators — never manually animate position
- Put reusable animation configs in `src/lib/motion.js`, not inline
- `AnimatedTabsList` + `AnimatedTabsTrigger` from `src/components/ui/animated-tabs.jsx` for any tab group that needs a sliding indicator

### 7.5 Adding New Juice

1. Define animation config in `src/lib/motion.js` if reusable
2. Wrap element with `motion.div` (or use `motion.` prefix on HTML elements)
3. Keep it subtle — if a user notices the animation consciously, it's too much
4. Test on mobile — animations that feel smooth on desktop can feel janky on phones

---

## 8. Accessibility

- All interactive elements must be keyboard accessible.
- Color contrast must meet WCAG AA (4.5:1 for text, 3:1 for large text).
- Use semantic HTML (`<main>`, `<nav>`, `<section>`, `<button>`).
- `aria-label` on icon-only buttons (theme toggle, wallet button when collapsed).
- Toast notifications must use `role="status"` or `aria-live="polite"`.
- Streak fire animations use `aria-hidden="true"` (decorative).

---

## 9. Error Handling Patterns

### 9.1 Transaction Errors

```javascript
// Pattern for write operations
const handleCheckIn = async () => {
  try {
    const hash = await writeContractAsync({
      /* ... */
    });
    toast({ title: t("toast.checkinPending") });

    await waitForTransactionReceipt(config, { hash });
    toast({ title: t("toast.checkinSuccess") });

    // Refetch streak data
    queryClient.invalidateQueries({ queryKey: ["streak", address] });
  } catch (error) {
    if (error.message?.includes("onAttest")) {
      toast({ title: t("toast.checkinDuplicate"), variant: "destructive" });
    } else {
      toast({ title: t("toast.checkinFailed"), variant: "destructive" });
    }
  }
};
```

### 9.2 Network Errors

- Show inline error message with retry button.
- Never crash the app. Wrap all async operations in try/catch.
- Use TanStack Query's `isError` / `error` states for read operations.

### 9.3 Wallet Not Connected

- Show the check-in UI in a "preview" state (streak at 0, button shows "Connect Wallet").
- Do not hide the app behind a wallet gate.

### 9.4 Onchain Transaction Feedback (Hard Rule)

Every onchain write operation MUST implement all three feedback mechanisms:

1. **Loading state covering full tx lifecycle** — Use manual `useState` (e.g. `isClaiming`, `isCheckingIn`) that is `true` from before `writeContractAsync` through `waitForTransactionReceipt` and cache update. Do NOT rely on wagmi's `isPending` alone — it only tracks tx submission, not confirmation.

2. **Toast notifications** — Show `toast.success(t("toast.<action>Success"))` after receipt confirmation. Show `toast.error(t("toast.<action>Failed"), { description })` in the catch block using `parseContractError` for user-friendly messages.

3. **Query invalidation** — After a successful tx, update the relevant TanStack Query cache entries immediately (via `queryClient.setQueryData` for instant UI update) and call `queryClient.refetchQueries` for belt-and-suspenders freshness.

**Reference implementation:** `src/hooks/useCheckIn.js` is the canonical pattern. All new write hooks must follow this structure.

**Button UX during tx:**

- Disabled with `Loader2` spinner
- Label switches to present participle (e.g. "Claiming...", "Checking In...")
- After success, UI reflects new state without page reload

---

## 10. Reactive State Updates

All onchain operations and authentication state changes must reflect immediately in the UI without requiring a page reload. This is a hard rule.

### 10.1 Principles

1. **Event-driven feedback**: Every write operation (check-in, claim, swap, connect, disconnect) must update UI state reactively via callbacks, event listeners, or query invalidation — never by relying on the user to refresh.
2. **Unified state sources**: When multiple auth/connection providers exist (e.g. wagmi + Farcaster), create a unified hook that merges their state. Components must never read from only one provider when multiple are active.
3. **Disconnect must clear all providers**: If the app supports multiple login methods, the disconnect action must sign out of all active sessions (wagmi `disconnect()` + Farcaster `signOut()`, etc.) in a single handler.
4. **Optimistic UI where safe**: For non-critical reads (e.g. streak display after check-in), use TanStack Query's `invalidateQueries` to trigger a refetch immediately after a successful transaction.
5. **No stale UI**: If a component renders differently based on connection state, it must re-render the instant that state changes. Test this by verifying the mock state change triggers the expected UI change within the same render cycle.

### 10.2 Anti-patterns

- Reading `useAccount()` directly in components when a unified address hook exists.
- Calling only one provider's disconnect when multiple auth methods are active.
- Relying on page reload to sync UI with onchain state.
- Polling for state changes that can be detected via events or query invalidation.

---

## 11. Performance

- **Bundle size**: Keep under 300KB gzipped. Monitor with `vite-plugin-compression`.
- **Code splitting**: Lazy-load the swap page (`React.lazy`).
- **Images**: Use WebP/AVIF. Inline small SVGs.
- **Fonts**: Preload Noto Serif JP (woff2). Use `font-display: swap`.
- **Onchain reads**: Cache via TanStack Query with appropriate `staleTime` (streak data: 30s, price data: 10s).
