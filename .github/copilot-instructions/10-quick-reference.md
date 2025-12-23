# Common Pitfalls & Quick Reference

## Common Pitfalls to Avoid

1. ❌ **Don't use Lucide icons** - Use Phosphor only
2. ❌ **Don't look for tailwind.config.js** - Use `app.css` with `@theme`
3. ❌ **Don't route reads through backend** - Use direct Supabase
4. ❌ **Don't use plain borders** - Use `border-white/5` for dark mode
5. ❌ **Don't forget icon weights** - Always specify `weight="bold"` or `weight="fill"`
6. ❌ **Don't skip Redis cache** - Always check cache before DB queries in backend
7. ❌ **Don't use ioredis in serverless** - Use `@upstash/redis` HTTP SDK
8. ❌ **Don't forget PORT=8080** - Cloud Run requires port 8080 (set automatically)
9. ❌ **Don't use `--set-env-vars` in Cloud Build** - Use `--update-env-vars` to preserve existing env vars
10. ❌ **Don't hardcode backend URLs** - Use `authFetch()` from `lib/api.ts` which auto-selects geo-routed URL
11. ❌ **Don't use INR (₹) currency** - All pricing is in USD ($). Use `CurrencyDollar` icon, `$` symbol, and `cost_usd` columns
12. ❌ **Don't add Anthropic/Groq/Together/Fireworks** - LLM providers intentionally limited to OpenAI only
13. ❌ **Don't confuse Voice Config LLM with Agent LLM** - They're separate configurations for different use cases
14. ❌ **Don't use `successUrl` in Paddle checkout** - Prevents success dialog from showing; use `successCallback` instead
15. ❌ **Don't pass Paddle transaction IDs as `p_reference_id`** - Use `p_metadata` (Paddle IDs are strings, not UUIDs)
16. ❌ **Don't add metered/subscription billing** - App uses prepaid credits only via Paddle
17. ❌ **Don't use old WebSocket voice agent** - Voice calls use LiveKit (`livekit/agent/main.py`)
18. ❌ **Don't use Deepgram for STT** - Default to OpenAI Whisper for voice

---

## ⚡ Quick Reference Card

### Always Use
| Need | Use |
|------|-----|
| Icons | `@phosphor-icons/react` with `weight="bold"` |
| Logging | `logger` from `@/lib/logger` |
| Constants | `API, ROUTES, LIMITS` from `@/lib/constants` |
| UI Components | Import from `@/components/ui` |
| Hooks | Import from `@/hooks` |
| Colors | CSS variables: `bg-surface`, `text-textMain` |
| Borders | `border-white/5` or `border-white/10` |
| Glass Effect | `bg-surface/80 backdrop-blur-xl` |
| Voice Calls | LiveKit (`livekit/agent/main.py`) |

### Never Use
| Never | Why |
|-------|-----|
| `any` type | Use proper types or `unknown` |
| `console.log` | Use `logger` |
| Lucide icons | Project uses Phosphor |
| `tailwind.config.js` | Use `app.css` with `@theme` |
| Hardcoded colors | Use CSS variables |
| Backend for reads | Use direct Supabase |
| INR currency (₹) | All pricing in USD ($) |
| Old voice-agent service | Removed - use LiveKit |

---

## 🎯 Implementation Checklist (USE FOR EVERY TASK)

### Before You Write Any Code:
```
□ Read the user's request completely
□ Identify affected files (search codebase if needed)
□ Check existing patterns in similar files
□ Plan the implementation approach
```

### During Implementation:
```
□ Define TypeScript interfaces FIRST
□ Use existing UI components from components/ui/
□ Use existing hooks from hooks/
□ Use logger instead of console.log
□ Use constants from lib/constants.ts
□ Handle loading states with Skeleton
□ Handle error states gracefully
□ Validate all user inputs
```

### After Implementation:
```
□ Create test file if new feature
□ Run: npm run typecheck
□ Run: npm run lint
□ Run: npm run test:run
□ Verify the change works as expected
```

---

## 🏁 Example: Complete Feature Implementation

When user says: "I want to add a delete button to assistant cards"

### Your Implementation Process:

**1. Analyze:**
- Where: `pages/Assistants.tsx` or `components/AssistantCard.tsx`
- Pattern: Check existing delete implementations
- Security: Verify user owns assistant (RLS handles it)

**2. Define Types:**
```typescript
interface DeleteAssistantProps {
  assistantId: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}
```

**3. Implement with Security:**
```typescript
const handleDelete = async () => {
  if (!confirm('Are you sure?')) return;
  
  try {
    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', assistantId);  // RLS ensures user owns it
    
    if (error) throw error;
    logger.info('Assistant deleted', { assistantId });
    onSuccess();
  } catch (error) {
    logger.error('Failed to delete assistant', { error, assistantId });
    onError(error as Error);
  }
};
```

**4. Create Test:**
```typescript
// __tests__/components/DeleteAssistant.test.tsx
describe('DeleteAssistant', () => {
  it('calls onSuccess after successful deletion', async () => {});
  it('calls onError when deletion fails', async () => {});
  it('shows confirmation before deleting', () => {});
});
```

**5. Verify:**
```bash
npm run typecheck && npm run lint && npm run test:run
```
