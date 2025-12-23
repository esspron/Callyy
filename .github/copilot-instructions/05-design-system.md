# Design System & Styling

## Tailwind CSS v4 Configuration
- **Configuration**: Tailwind v4 uses `@tailwindcss/vite` plugin and CSS-first config in `frontend/app.css`.
- **DO NOT** create or look for `tailwind.config.js` - it doesn't exist.
- **Theme Variables**: Defined in `app.css` using `@theme` directive with OKLCH P3 colors.

---

## Color System (OKLCH P3 Gamut)
```css
/* Primary Colors */
--color-primary: oklch(0.72 0.15 180);      /* Teal/Cyan */
--color-primaryHover: oklch(0.65 0.14 180);

/* Background Colors (Dark Mode) */
--color-background: oklch(0.13 0.01 250);
--color-surface: oklch(0.16 0.01 250);
--color-surfaceHover: oklch(0.20 0.01 250);

/* Text Colors */
--color-textMain: oklch(0.93 0.01 250);
--color-textMuted: oklch(0.65 0.02 250);
```

---

## Design Patterns - Premium SaaS Standards
- **Glassmorphism**: Use `bg-surface/80 backdrop-blur-xl` for glass effects.
- **Borders**: Use `border-white/5` or `border-white/10` for subtle borders.
- **Hover States**: Include `hover:-translate-y-0.5` and `hover:shadow-xl` for lift effects.
- **Gradients**: Use gradient backgrounds for icons: `bg-gradient-to-br from-primary/20 to-primary/10`.
- **Ambient Glows**: Add blur elements for depth: `<div className="absolute ... blur-3xl bg-primary/5" />`.

---

## Icon System - Phosphor Icons

### CRITICAL: Use Phosphor Icons ONLY
- **Package**: `@phosphor-icons/react`
- **DO NOT** use `lucide-react` - it has been fully removed from the project.

### Icon Usage Pattern
```tsx
import { Robot, Phone, Sparkle, Lightning } from '@phosphor-icons/react';

// With weight prop (bold, fill, duotone, etc.)
<Robot size={20} weight="bold" />
<Phone size={18} weight="fill" className="text-primary" />
<Sparkle size={24} weight="duotone" />
```

### Common Icon Mappings (Lucide → Phosphor)
| Old (Lucide) | New (Phosphor) |
|--------------|----------------|
| `Search` | `MagnifyingGlass` |
| `Loader2` | `CircleNotch` |
| `HelpCircle` | `Question` |
| `Edit2` | `PencilSimple` |
| `Download` | `DownloadSimple` |
| `AlertCircle` | `Warning` |
| `Zap` | `Lightning` |
| `Sparkles` | `Sparkle` |
| `ChevronRight` | `CaretRight` |
| `DollarSign` | `CurrencyDollar` |
| `Github` | `GithubLogo` |
| `Mail` | `EnvelopeSimple` |
| `EyeOff` | `EyeSlash` |
| `ExternalLink` | `ArrowSquareOut` |

### Icon Weights
- `"bold"` - Default for UI icons
- `"fill"` - For active/selected states
- `"duotone"` - For decorative/large icons

---

## Typography

### Fonts
- **UI Font**: Inter (Google Fonts)
- **Logo Font**: Ahsing (custom font in `/fonts/ahsing.otf`)
- **Indian Languages**: Noto Sans Devanagari

### Logo Component
```tsx
import VoicoryLogo from './VoicoryLogo';
<VoicoryLogo size="lg" /> // Uses Ahsing font with gradient
```

---

## Component Patterns

### Loading States - Skeleton Loaders
```tsx
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded ${className}`} />
);
```

### Empty States
- Include gradient icon container
- Clear heading + subtext
- Primary CTA button

### Cards with Ambient Glow
```tsx
<div className="relative bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 overflow-hidden">
    {/* Ambient glow */}
    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl" />
    {/* Content */}
</div>
```

### Buttons
```tsx
// Primary Button
<button className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5">
    Create
</button>

// Secondary Button
<button className="px-4 py-2 bg-surface border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-colors">
    Cancel
</button>
```

### Tab/Navigation Buttons - Premium Pill Style
Use this pattern for horizontal tabs, filter toggles, and segmented controls:

```tsx
// Tab/Pill Button - Active State
<button className="group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5">
    {/* Active indicator dot */}
    <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />
    <Icon size={18} weight="fill" className="text-primary" />
    Label
</button>

// Tab/Pill Button - Inactive State
<button className="group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent">
    <Icon size={18} weight="regular" className="group-hover:text-primary" />
    Label
</button>
```

### Tab Container Pattern
```tsx
<div className="flex gap-1 border-b border-white/5 px-6 py-2">
    {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                    : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                }`}
            >
                {isActive && <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full animate-pulse" />}
                <tab.icon size={18} weight={isActive ? "fill" : "regular"} className={isActive ? 'text-primary' : 'group-hover:text-primary'} />
                {tab.label}
            </button>
        );
    })}
</div>
```

### CSS Utility Classes (in app.css)
- `.tab-container` - Container with backdrop blur
- `.tab-btn` - Base tab button style
- `.tab-btn-active` - Active tab with gradient background
