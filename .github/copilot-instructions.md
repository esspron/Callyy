# AI Coding Agent Instructions

> **Note**: These instructions have been modularized for easier maintenance.
> See the [copilot-instructions/](./copilot-instructions/) folder for detailed documentation.

## Quick Reference

### Core Development
- [Overview & Workflow](./copilot-instructions/00-overview.md)
- [Code Quality](./copilot-instructions/01-code-quality.md)
- [Security](./copilot-instructions/02-security.md)
- [Quick Reference & Pitfalls](./copilot-instructions/10-quick-reference.md)

### Architecture
- [Project Architecture](./copilot-instructions/03-architecture.md)
- [Backend](./copilot-instructions/08-backend.md)
- [Deployment](./copilot-instructions/09-deployment.md)

### Frontend
- [UI Components](./copilot-instructions/04-ui-components.md)
- [Design System](./copilot-instructions/05-design-system.md)

### Integrations
- [All Integrations](./copilot-instructions/06-integrations.md)
- [Billing](./copilot-instructions/07-billing.md)

### Real Estate Vertical
- [Strategy](./copilot-instructions/11-real-estate-strategy.md)
- [Dev Priorities 1-5](./copilot-instructions/12-dev-priorities-1-5.md)
- [Dev Priorities 6-10](./copilot-instructions/13-dev-priorities-6-10.md)
- [N8N Automation](./copilot-instructions/14-n8n-automation.md)
- [Marketing Plan](./copilot-instructions/15-marketing-plan.md)
- [Technical Requirements](./copilot-instructions/16-technical-requirements.md)

---

## ⚡ Essential Quick Reference

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

### Verification Commands
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run test:run   # Must pass
```
