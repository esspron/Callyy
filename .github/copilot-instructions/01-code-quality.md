# Code Quality & Testing Standards

## TypeScript - Strict Mode Enabled
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```
- **NEVER use `any`** - Use proper types or `unknown`
- **ALWAYS define interfaces** for props, state, and API responses
- Run `npm run typecheck` before committing

## ESLint + Prettier
- Config: `.eslintrc.cjs` + `.prettierrc`
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix
- Prettier with Tailwind plugin for class sorting

## Pre-commit Hooks (Husky)
- Auto-runs ESLint + Prettier on staged files
- Blocks commits with lint errors

## Testing (Vitest + Testing Library)
- **27 tests** currently passing
- Run `npm run test:run` before pushing
- Test files: `__tests__/` and `hooks/__tests__/`

---

## 📋 Test File Requirements

### When to Create Tests
| Change Type | Test Required? | Test Location |
|-------------|----------------|---------------|
| New component | ✅ Yes | `__tests__/components/[Name].test.tsx` |
| New hook | ✅ Yes | `hooks/__tests__/[useName].test.ts` |
| New service function | ✅ Yes | `__tests__/services/[name].test.ts` |
| New utility | ✅ Yes | `__tests__/lib/[name].test.ts` |
| Bug fix | ✅ Yes (regression test) | Add to existing or create new |
| Styling only | ❌ No | - |
| Config change | ❌ No | - |

### Test File Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// For components
describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    // Test implementation
  });

  it('handles user interaction', async () => {
    // Test implementation
  });

  it('shows error state when API fails', async () => {
    // Test implementation
  });

  it('validates input before submission', () => {
    // Security test
  });
});

// For hooks
describe('useHookName', () => {
  it('returns initial state correctly', () => {});
  it('updates state on action', () => {});
  it('handles errors gracefully', () => {});
});

// For services
describe('serviceFunctionName', () => {
  it('returns data on success', async () => {});
  it('throws typed error on failure', async () => {});
  it('validates input parameters', () => {});
});
```
