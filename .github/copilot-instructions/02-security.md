# Security Requirements (NON-NEGOTIABLE)

## Frontend Security
```typescript
// ✅ ALWAYS validate user input
const schema = z.object({
  name: z.string().min(1).max(LIMITS.ASSISTANT_NAME_MAX),
  email: z.string().email(),
});

// ✅ ALWAYS sanitize before display
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

// ✅ NEVER expose secrets in frontend
// Use backend for: API keys, webhooks, payment processing

// ✅ ALWAYS check auth state
const { user } = useAuth();
if (!user) return <Navigate to="/login" />;
```

## Backend Security
```javascript
// ✅ ALWAYS validate request body
const { error, value } = schema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });

// ✅ ALWAYS use parameterized queries (Supabase handles this)
const { data } = await supabase.from('table').select('*').eq('user_id', userId);

// ✅ ALWAYS rate limit endpoints
app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));

// ✅ ALWAYS verify user owns the resource
const { data } = await supabase.from('assistants')
  .select('*')
  .eq('id', assistantId)
  .eq('user_id', req.user.id)  // RLS backup
  .single();
```

## Security Audit Checklist (Run mentally for every change)
```
□ SQL Injection - Using parameterized queries? ✓ Supabase handles
□ XSS - Sanitizing user content before render?
□ CSRF - Using proper auth headers?
□ Auth Bypass - Checking user permissions?
□ Data Exposure - Only returning necessary fields?
□ Rate Limiting - Protecting expensive operations?
□ Input Validation - Rejecting malformed data?
```
