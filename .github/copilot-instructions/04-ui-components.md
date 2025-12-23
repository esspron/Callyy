# UI Components, Hooks & Utilities

## Component Library (`components/ui/`)

### Atom Components (13 total)
| Component | Variants | Usage |
|-----------|----------|-------|
| `Button` | 8 variants, 5 sizes, loading state | Primary actions |
| `Input` | 3 variants, 3 sizes, icons | Form inputs |
| `Textarea` | 2 variants, 3 sizes | Multi-line input |
| `Badge` | 8 variants, 4 sizes | Status indicators |
| `Skeleton` | 3 variants + presets | Loading states |
| `Toggle` | 3 sizes | Boolean settings |
| `Avatar` | 5 sizes, 2 shapes, status | User display |
| `Label` | Required/optional | Form labels |
| `Tooltip` | 4 positions | Help text |
| `Card` | 6 sub-components | Content containers |
| `Select` | HeadlessUI based | Dropdowns |
| `FadeIn` | Delay prop | Animations |
| `AmbientBackground` | GPU-aware | Backgrounds |

### Usage Pattern
```tsx
import { Button, Input, Badge } from '@/components/ui';

<Button variant="default" size="lg" loading={isSubmitting}>
  Create Assistant
</Button>
```

---

## Custom Hooks (`hooks/`)

| Hook | Purpose | Example |
|------|---------|---------|
| `useDebounce` | Debounce values | Search inputs |
| `useDebouncedCallback` | Debounce functions | API calls |
| `useLocalStorage` | Persist to localStorage | User preferences |
| `useAsync` | Async state management | Loading/error states |
| `useAsyncCallback` | Async with params | CRUD operations |
| `useClipboard` | Copy to clipboard | Copy API keys |
| `useBreakpoint` | Responsive design | Mobile detection |
| `useIsMobile` | Simple mobile check | Layout switching |
| `useIntersectionObserver` | Viewport detection | Lazy loading |
| `useScrollProgress` | Scroll position | Parallax effects |

### Usage Pattern
```tsx
import { useDebounce, useAsync, useClipboard } from '@/hooks';

const debouncedSearch = useDebounce(searchTerm, 300);
const { data, isLoading, execute } = useAsync(fetchAssistants);
const { copy, copied } = useClipboard();
```

---

## Utilities (`lib/`)

### Logger (`lib/logger.ts`)
```tsx
import { logger } from '@/lib/logger';

logger.debug('Fetching data', { userId });  // Dev only
logger.info('Assistant created');           // Dev only
logger.warn('Rate limit approaching');      // Always logged
logger.error('Failed to save', { error });  // Always logged
```
**NEVER use raw `console.log`** - Use logger instead

### Constants (`lib/constants.ts`)
```tsx
import { API, ROUTES, FEATURES, TIMING, LIMITS, ERRORS } from '@/lib/constants';

// API endpoints
API.BACKEND_URL
API.SUPABASE_URL

// Routes
ROUTES.ASSISTANTS
ROUTES.BILLING

// Feature flags
FEATURES.WHATSAPP_ENABLED

// Timing
TIMING.SEARCH_DEBOUNCE  // 300ms
TIMING.API_DEBOUNCE     // 500ms

// Validation limits
LIMITS.ASSISTANT_NAME_MAX  // 100 chars
```
