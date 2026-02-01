# Claude Code Project Guidelines

Client Context: Knight Industrial Inc. - Fortune 500 client standards required.
Last Updated: January 2026 - verify with web search if info seems outdated.

---

## NEVER DO THESE

- **Never create** dev, sandbox, test, or temporary environments/servers
- **Never hack together code** - find the proper architectural solution
- **Never create AI-looking websites** (generic gradients, chatbot UI, stock AI imagery, SaaS templates)
- **Never use emojis** in UI, code comments, commit messages, or documentation - instant AI giveaway
- **Never skip** responsive design or SEO requirements
- **Never ask the user** to do something the CLI can handle
- **Never ask the user** to test or verify something you can check yourself
- **Never use** deprecated APIs, legacy patterns, or quick fixes
- **Never commit** secrets or API keys to the repository
- **Never use** console.log without context - always include structured, searchable logs

---

## ALWAYS DO THESE

- **Always test your own work** - verify data exists, endpoints respond, queries return expected results
- **Always check database** - run queries to confirm data is there before telling user it's done
- **Always verify API responses** - curl endpoints, check status codes, validate JSON structure
- **Always confirm file operations** - check files exist, have correct content, proper permissions
- **Always validate deployments** - check logs, health endpoints, service status after deploy
- **Always run the code** - don't assume it works, execute and verify output
- **Always use the CLI** - automate everything possible, never make user do manual checks
- **Always use structured logging** - make logs searchable and filterable via Railway CLI

---

## Logging Standards

Good logging is essential for troubleshooting via `railway logs`. Every log should be searchable and provide context.

### Log Format
```typescript
// Use structured logging with consistent prefixes
console.log('[SERVICE:action] Description', { relevantData });
console.error('[SERVICE:error] Description', { error, context });

// Examples:
console.log('[API:request] Incoming request', { method, path, userId });
console.log('[DB:query] Executing query', { table, operation });
console.log('[STRIPE:webhook] Payment received', { eventId, amount });
console.error('[AUTH:error] Login failed', { userId, reason });
```

### Log Levels and Prefixes
| Prefix | Use For | Example |
|--------|---------|---------|
| `[SERVICE:start]` | Service initialization | `[API:start] Server listening on port 3000` |
| `[SERVICE:request]` | Incoming requests | `[API:request] GET /users` |
| `[SERVICE:response]` | Outgoing responses | `[API:response] 200 OK in 45ms` |
| `[SERVICE:error]` | Errors and exceptions | `[DB:error] Connection failed` |
| `[SERVICE:warn]` | Warnings | `[CACHE:warn] Cache miss for key xyz` |
| `[SERVICE:success]` | Successful operations | `[PAYMENT:success] Charge completed` |
| `[SERVICE:debug]` | Debug info (remove in prod) | `[AUTH:debug] Token payload` |

### What to Log
```typescript
// Application lifecycle
console.log('[APP:start] Application starting', { version, env });
console.log('[APP:ready] Application ready', { port, database: 'connected' });
console.log('[APP:shutdown] Graceful shutdown initiated');

// API requests (log entry and exit)
console.log('[API:request]', { method, path, userId, ip });
console.log('[API:response]', { method, path, status, duration: '45ms' });

// Database operations
console.log('[DB:query]', { operation: 'SELECT', table: 'users', duration: '12ms' });
console.error('[DB:error]', { operation: 'INSERT', table: 'orders', error: err.message });

// External services
console.log('[STRIPE:request] Creating payment intent', { amount, currency });
console.log('[STRIPE:success] Payment completed', { paymentId, amount });
console.error('[STRIPE:error] Payment failed', { error: err.message, code: err.code });

// Background jobs / Cron
console.log('[CRON:start] Email job starting', { jobId, queueSize: 150 });
console.log('[CRON:complete] Email job finished', { jobId, sent: 150, failed: 2 });

// Authentication
console.log('[AUTH:login] User logged in', { userId });
console.log('[AUTH:logout] User logged out', { userId });
console.error('[AUTH:error] Invalid token', { reason: 'expired' });
```

### Searching Logs with Railway CLI
```bash
# Search for errors
railway logs --limit 200 | grep -i '\[.*:error\]'

# Search specific service
railway logs --limit 200 | grep '\[API:'

# Search for specific operation
railway logs --limit 200 | grep '\[STRIPE:'

# Search for user activity
railway logs --limit 200 | grep 'userId.*abc123'

# Tail logs and filter
railway logs -f | grep -i 'error\|warn'

# Get logs around a timestamp
railway logs --limit 500 | grep -A5 -B5 '2026-01-15T10:30'
```

### Logging Libraries (Recommended)
```typescript
// Use pino for structured JSON logging (fast, Railway-friendly)
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

logger.info({ service: 'API', action: 'request', method: 'GET', path: '/users' }, 'Incoming request');
logger.error({ service: 'DB', action: 'error', err }, 'Query failed');
```

### What NOT to Log
- Passwords, tokens, API keys, secrets
- Full credit card numbers (use last 4 only)
- Personal health information
- Full request/response bodies in production (too verbose)
- High-frequency debug logs in production

---

## Testing and Verification (Claude's Responsibility)

The user should not have to test basic functionality. Claude verifies everything before reporting done.

### Database Verification
```bash
# Connect and verify data exists
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
railway run psql $DATABASE_URL -c "SELECT * FROM orders LIMIT 5;"

# Check table structure
railway run psql $DATABASE_URL -c "\d tablename"

# Verify migrations ran
railway run psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### API Endpoint Testing
```bash
# Test endpoints respond correctly
curl -sf https://$DOMAIN/api/health | jq .
curl -sf https://$DOMAIN/api/users | jq '.data | length'

# Check response codes
curl -o /dev/null -s -w '%{http_code}' https://$DOMAIN/api/endpoint

# Test with authentication
curl -H "Authorization: Bearer $TOKEN" https://$DOMAIN/api/protected | jq .

# POST request testing
curl -X POST https://$DOMAIN/api/resource \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' | jq .
```

### File and Build Verification
```bash
# Verify files exist and have content
ls -la ./path/to/file
cat ./path/to/file | head -20
wc -l ./path/to/file

# Check build output
ls -la ./dist/
du -sh ./dist/

# Verify environment variables are set
railway run printenv | grep EXPECTED_VAR
```

### Frontend Verification
```bash
# Check page loads
curl -sf https://$DOMAIN/ | grep -o '<title>.*</title>'

# Verify static assets
curl -sf -o /dev/null -w '%{http_code}' https://$DOMAIN/assets/main.js

# Check meta tags for SEO
curl -sf https://$DOMAIN/ | grep -E '<meta (name|property)='

# Test responsive meta tag exists
curl -sf https://$DOMAIN/ | grep 'viewport'
```

### Stripe Integration Verification
```bash
# Test Stripe connection (use test mode)
curl https://api.stripe.com/v1/balance \
  -u $STRIPE_SECRET_KEY: | jq .

# Verify webhook endpoint responds
curl -X POST https://$DOMAIN/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}' -o /dev/null -w '%{http_code}'
```

### Log Analysis
```bash
# Check for errors after any operation
railway logs --limit 100 2>&1 | grep -iE 'error|failed|crash|exception|warn'

# Verify specific operation completed
railway logs --limit 50 | grep -i 'migration\|seed\|complete\|success'

# Check structured logs for specific service
railway logs --limit 100 | grep '\[API:error\]'
```

### What to Verify Before Saying "Done"
1. Database: Data actually exists (run SELECT queries)
2. API: Endpoints return expected data (curl and check response)
3. Frontend: Pages load, assets serve, meta tags present
4. Deployment: Service running, no errors in logs, health check passes
5. Files: Created files exist with correct content
6. Environment: Variables are set and accessible
7. Integrations: External services respond (Stripe, email providers)
8. Logs: Proper logging in place, searchable via Railway CLI

---

## Infrastructure Stack

### Standard Services
| Service | Provider | Notes |
|---------|----------|-------|
| Databases | Railway | Postgres, MySQL, Redis hosted on Railway |
| Email | Cron jobs | Scheduled tasks handle email sending |
| Payments | Stripe | All payment processing through Stripe |
| Hosting | Railway | All services deployed to Railway |
| CI/CD | GitHub Actions | Automated deployments on push |

### Database (Railway-hosted)
```bash
# Add a database to your project
railway add

# Common database variables (auto-generated by Railway)
${{Postgres.DATABASE_URL}}
${{Redis.REDIS_URL}}
${{MySQL.DATABASE_URL}}

# Verify database connection
railway run psql $DATABASE_URL -c "SELECT 1;"
```

### Email (Cron Jobs)
- Email sending handled by scheduled cron jobs
- Use Railway cron jobs or GitHub Actions scheduled workflows
- Queue emails in database, process via cron
- Common providers: Resend, SendGrid, Postmark (API calls from cron)

### Payments (Stripe)
- All payment processing through Stripe
- Store Stripe keys in Railway sealed variables
- Use Stripe webhooks for payment events
- Never log or expose payment data

```bash
# Stripe variables in Railway
railway variables --set STRIPE_SECRET_KEY=sk_live_xxx
railway variables --set STRIPE_WEBHOOK_SECRET=whsec_xxx
railway variables --set STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## Railway Platform

### Authentication
```bash
railway login              # Interactive (opens browser)
railway login --browserless # Headless/SSH environments
```

### Essential Commands
```bash
railway link                        # Link to existing project
railway up --service=$SERVICE_ID    # Deploy to specific service
railway up --detach                 # Deploy without waiting
railway status                      # Check project status
railway logs                        # View deployment logs
railway logs --limit 100            # View more logs
railway logs -f                     # Tail logs in real-time
railway logs | grep '\[.*:error\]'  # Filter for errors
railway variables                   # List all variables
railway variables --set KEY=value   # Set a variable
railway ssh                         # SSH into running service
railway run <cmd>                   # Run locally with Railway env vars
railway redeploy                    # Redeploy current deployment
railway add                         # Add database or service
```

### Variables - Stored in Railway, NOT in code
```bash
# Template syntax
${{shared.VAR}}                    # Shared variable
${{ServiceName.VAR}}               # Service variable  
${{Postgres.DATABASE_URL}}         # Database URL
${{RAILWAY_PUBLIC_DOMAIN}}         # Public domain
```

### Tokens
- `RAILWAY_TOKEN` - Project-level (deploy, logs, redeploy)
- `RAILWAY_API_TOKEN` - Account-level (create projects, whoami, link)

---

## POST-DEPLOYMENT VERIFICATION (Required)

After EVERY deployment, wait 6 minutes then verify:

```bash
# 1. Deploy
railway up --service=$SERVICE_ID

# 2. Wait 6 minutes for stabilization
sleep 360

# 3. Check Railway status
railway status
railway logs --limit 50 2>&1 | grep -iE 'error|failed|crash|exception' || echo "No errors"

# 4. Check GitHub status
gh run list --limit 3

# 5. Health check (if public endpoint)
curl -sf https://$DOMAIN/health && echo "OK" || echo "FAILED"
curl -o /dev/null -s -w '%{http_code}' https://$DOMAIN

# 6. Verify app is actually working
curl -sf https://$DOMAIN/ | grep -o '<title>.*</title>'
curl -sf https://$DOMAIN/api/health | jq .

# 7. Check logs for startup success
railway logs --limit 20 | grep '\[APP:ready\]\|\[API:start\]'
```

---

## Web Design Standards

### NO AI-Looking Websites
- No generic gradient backgrounds (purple-to-blue, etc.)
- No floating chatbot-style UI elements
- No stock AI/robot imagery
- No overly rounded cards with drop shadows everywhere
- No "Powered by AI" badges
- No generic SaaS template aesthetics
- No emojis anywhere in the UI - dead giveaway of AI-generated content

### Professional Design (Fortune 500 Standard)
- Clean, minimal layouts with intentional whitespace
- Professional typography (max 2-3 font weights)
- Consistent 8px spacing grid
- Subtle, purposeful animations only
- Brand-aligned colors (not generic tech colors)
- High-quality imagery (no obvious stock photos)
- Use proper icons (Lucide, Heroicons, custom SVGs) - never emojis

### Responsive Breakpoints (Mobile-First)
| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile S | 320px | Small phones |
| Mobile M | 375px | Standard phones |
| Mobile L | 425px | Large phones |
| Tablet | 768px | iPad, tablets |
| Laptop | 1024px | Small laptops |
| Desktop | 1440px | Standard desktop |
| 4K | 2560px | Large monitors |

Requirements:
- Design for 320px first, scale up
- Touch targets minimum 44x44px on mobile
- 16px minimum base font size
- No horizontal scrolling at any breakpoint
- Test on actual devices

---

## SEO Requirements (Every Page)

### Technical SEO
- Semantic HTML5 (`<header>`, `<main>`, `<nav>`, `<article>`, `<section>`)
- Unique `<title>` tags (50-60 characters)
- Meta descriptions (150-160 characters)
- Canonical URLs on all pages
- Open Graph and Twitter Card meta tags
- Structured data (JSON-LD) where applicable
- XML sitemap
- robots.txt

### Content SEO
- Single H1 per page, logical H2-H6 hierarchy
- Descriptive alt text on ALL images
- URL structure: lowercase, hyphens, descriptive
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Accessibility (WCAG 2.1 AA)
- Keyboard navigation support
- ARIA labels where needed
- Color contrast: 4.5:1 text, 3:1 large text
- Visible focus indicators
- Screen reader compatible

---

## Code Quality Standards (2026)

### Modern Stack
| Category | Standard |
|----------|----------|
| TypeScript | Strict mode, no `any` types |
| React | Functional components, hooks only |
| State | Zustand, Jotai, or React Query |
| Styling | Tailwind CSS or CSS Modules |
| API | tRPC, GraphQL, or typed REST |
| Testing | Vitest + Testing Library |
| Build | Vite, Turbopack, or esbuild |

### Architecture
- Feature-based folder structure (not type-based)
- Separation of concerns: UI, logic, data
- Custom hooks for reusable logic
- Proper error boundaries and loading states
- Environment configs (no hardcoded values)

### Performance
- Lazy loading for routes and heavy components
- Image optimization (WebP, AVIF, responsive srcset)
- Code splitting and tree shaking
- Server-side rendering or static generation where appropriate

---

## Anthropic Claude API

### Models (January 2026) - Pin these versions in production
```
claude-sonnet-4-5-20250929  # Recommended - best balance
claude-haiku-4-5-20251001   # Fast, cost-effective
claude-opus-4-5-20251101    # Maximum capability
```

### Pricing (per million tokens)
| Model | Input | Output |
|-------|-------|--------|
| Sonnet 4.5 | $3 | $15 |
| Haiku 4.5 | $1 | $5 |
| Opus 4.5 | $5 | $25 |

### Context Windows
- Sonnet 4.5: 200K (1M beta)
- Haiku 4.5: 200K
- Opus 4.5: 200K
- Max output: 64K tokens (all models)

---

## GitHub Actions

### Deploy Workflow with Verification
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    container: ghcr.io/railwayapp/cli:latest
    env:
      RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        run: railway up --service=${{ vars.SERVICE_ID }}
      
      - name: Wait 6 minutes
        run: sleep 360
      
      - name: Verify
        run: |
          railway status
          railway logs --limit 50 2>&1 | grep -iE 'error|failed|crash' || echo "OK"
      
      - name: Health check
        run: |
          curl -sf https://${{ vars.PUBLIC_DOMAIN }}/health || exit 1
```

---

## Documentation Links

- Railway: https://docs.railway.com
- Railway CLI: https://docs.railway.com/guides/cli
- Railway Variables: https://docs.railway.com/guides/variables
- Claude API: https://platform.claude.com/docs
- Stripe: https://stripe.com/docs
- GitHub CLI: https://cli.github.com/manual
- GitHub Actions: https://docs.github.com/actions

---

## Quick Reminders

1. Test and verify your own work - user should not have to check if it works
2. Use structured logging - `[SERVICE:action]` format, searchable via `railway logs`
3. Variables live in Railway - not in code repos
4. Databases hosted on Railway - use `railway add`
5. Email handled by cron jobs - queue and process
6. Payments through Stripe - keys in Railway sealed variables
7. Use the CLI - don't ask user to click buttons
8. Verify every deployment - 6 minute wait, then check
9. No dev environments - use existing staging/production only
10. Professional design - Fortune 500 standards, no AI aesthetics
11. No emojis - use proper icons (Lucide, Heroicons, SVGs)
12. SEO always - every page, every time
13. Responsive always - 320px to 4K
14. Modern code - it's 2026, use current best practices
