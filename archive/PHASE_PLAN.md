# Phase 7+ Implementation Plan: Next Steps for Zoid AI

## Current Status

**Completed:**
- ✅ Phases 1-7: Core features, RAG, voice, Arabic support, telephony, call handling, monitoring
- ✅ Working phone number: +1 (510) 370 5981
- ✅ Vapi webhook integration with comprehensive metrics extraction
- ✅ Call logging and analytics dashboard
- ✅ Error recovery with retry logic and circuit breaker

**Critical Gap:** Product is NOT production-ready. Runs only on localhost, no multi-tenancy, no auth, no payments.

---

## Strategic Decision Point

**Option A: Customer Discovery First (RECOMMENDED)**
Focus on finding customers before building infrastructure. See BUSINESS_STRATEGY.md.

**Option B: Build Infrastructure**
Proceed with Phases 8-13 to make product self-service ready.

**This plan covers Option B** (infrastructure work).

---

## Phase 8: Deployment & Internet Access

### Objective
Make the app accessible on the internet, not just localhost.

### Technical Implementation

**1. Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**2. Environment Variables Setup**
Configure in Vercel dashboard:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_WEBHOOK_TOKEN`
- `NEXT_PUBLIC_APP_URL` (e.g., https://zoid.vercel.app)

**3. Database Connection Pooling**
Update `lib/supabase.ts`:
```typescript
// Use connection pooling for production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV === 'production') {
  // Use pooling endpoint
  const poolingUrl = supabaseUrl.replace('.supabase.co', '.supabase.co:6543');
}
```

**4. Update Vapi Webhook URLs**
- Log into Vapi dashboard
- Update webhook URL to production URL
- Update server function URL
- Test webhook delivery

**5. Custom Domain (Optional)**
- Purchase domain (e.g., zoid.ai)
- Configure DNS in Vercel
- Update `NEXT_PUBLIC_APP_URL`
- Update Vapi webhooks

**Files to Create:**
- `vercel.json` - Deployment configuration
- `.env.production.example` - Production env template
- `docs/DEPLOYMENT.md` - Deployment guide

**Testing:**
- [ ] App accessible at production URL
- [ ] All API routes working
- [ ] Webhooks receiving events
- [ ] Database queries working
- [ ] Phone calls connecting

---

## Phase 9: Multi-Tenancy & Data Isolation

### Objective
Each customer gets isolated workspace and data.

### Database Schema Changes

**1. Create Organizations Table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Add Tenant Context to Existing Tables**
```sql
-- Add organization_id to documents
ALTER TABLE documents ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_documents_org ON documents(organization_id);

-- Add organization_id to call_logs
ALTER TABLE call_logs ADD COLUMN organization_id UUID REFERENCES call_logs(id);
CREATE INDEX idx_call_logs_org ON call_logs(organization_id);
```

**3. Row-Level Security (RLS)**
```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users see only their org's documents"
  ON documents FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Users see only their org's calls"
  ON call_logs FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### Code Implementation

**1. Tenant Context Middleware**
Create `lib/tenant.ts`:
```typescript
export async function getTenantId(req: Request): Promise<string | null> {
  // Extract from session, JWT, or subdomain
  const session = await getSession(req);
  return session?.organizationId || null;
}

export async function setTenantContext(organizationId: string) {
  // Set in Supabase context
  await supabase.rpc('set_config', {
    setting: 'app.current_organization_id',
    value: organizationId
  });
}
```

**2. Update All API Routes**
Add tenant context to every database query:
```typescript
// Before
const { data } = await supabase.from('documents').select('*');

// After
const tenantId = await getTenantId(req);
await setTenantContext(tenantId);
const { data } = await supabase.from('documents').select('*');
```

**3. Migration Script**
Create `lib/migrations.ts` to handle existing data.

**Files to Create:**
- `lib/tenant.ts` - Tenant management
- `middleware-tenant.ts` - Tenant isolation middleware
- `migrations/001_add_multi_tenancy.sql`
- `lib/migrations.ts` - Migration runner

**Testing:**
- [ ] Create 2 test organizations
- [ ] Verify data isolation
- [ ] Test RLS policies
- [ ] Verify no cross-tenant data leaks

---

## Phase 10: User Authentication & Sign-Up

### Objective
Users can sign up, log in, access workspace.

### Implementation Using NextAuth.js

**1. Install Dependencies**
```bash
npm install next-auth @auth/supabase-adapter bcryptjs
npm install -D @types/bcryptjs
```

**2. Database Schema**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'owner',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. Auth Configuration**
Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Verify email/password
        // Return user object
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Add organizationId to session
    }
  }
};
```

**4. Sign-Up Flow**
Create `app/api/auth/signup/route.ts`:
```typescript
export async function POST(req: Request) {
  const { email, password, companyName } = await req.json();
  
  // 1. Hash password
  const hash = await bcrypt.hash(password, 10);
  
  // 2. Create organization
  const org = await createOrganization(companyName);
  
  // 3. Create user
  const user = await createUser(email, hash, org.id);
  
  // 4. Send verification email (optional)
  
  return NextResponse.json({ success: true });
}
```

**5. Protected Routes**
Create `middleware.ts`:
```typescript
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
```

**Files to Create:**
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/signup/route.ts`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `middleware.ts`
- `lib/auth.ts`

**Testing:**
- [ ] Sign up new user
- [ ] Log in
- [ ] Access protected routes
- [ ] Log out
- [ ] Password reset

---

## Phase 11: Payment Integration & Usage Tracking

### Objective
Free tier ($1 limit) then paid plans.

### Stripe Integration

**1. Install Stripe**
```bash
npm install stripe @stripe/stripe-js
```

**2. Database Schema**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  calls_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);
```

**3. Usage Tracker**
Create `lib/usage-tracker.ts`:
```typescript
export async function trackUsage(organizationId: string, usage: {
  costUsd: number;
  callsCount: number;
  tokensUsed: number;
}) {
  const today = new Date().toISOString().split('T')[0];
  
  // Upsert daily usage
  await supabase
    .from('usage_tracking')
    .upsert({
      organization_id: organizationId,
      date: today,
      cost_usd: usage.costUsd,
      calls_count: usage.callsCount,
      tokens_used: usage.tokensUsed
    });
  
  // Check limit
  const totalCost = await getTotalCost(organizationId);
  if (totalCost > LIMITS[plan].maxCost) {
    await suspendService(organizationId);
    await sendUsageAlert(organizationId);
  }
}
```

**4. Stripe Webhook**
Create `app/api/stripe/webhook/route.ts`:
```typescript
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, secret);
  
  switch (event.type) {
    case 'customer.subscription.created':
      // Update subscription status
      break;
    case 'invoice.payment_failed':
      // Suspend service
      break;
  }
}
```

**5. Billing Dashboard**
Create `components/billing-dashboard.tsx` showing:
- Current plan
- Usage this month
- Cost breakdown
- Upgrade options

**Files to Create:**
- `lib/stripe.ts`
- `lib/billing.ts`
- `lib/usage-tracker.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/stripe/create-checkout/route.ts`
- `components/billing-dashboard.tsx`

**Testing:**
- [ ] Free tier limit works
- [ ] Usage tracked correctly
- [ ] Service suspends at limit
- [ ] Upgrade flow works
- [ ] Stripe webhooks received

---

## Phase 12: Per-Tenant Phone Number Provisioning

### Objective
Each customer gets own phone number.

### Implementation

**1. Database Schema**
```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  vapi_phone_number_id VARCHAR(255),
  vapi_assistant_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Vapi Phone Provisioning**
Create `lib/vapi-tenant.ts`:
```typescript
export async function provisionPhoneNumber(organizationId: string) {
  // 1. Call Vapi API to buy phone number
  const response = await fetch('https://api.vapi.ai/phone-number', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    },
    body: JSON.stringify({
      areaCode: '510' // Or let customer choose
    })
  });
  
  const { id, number } = await response.json();
  
  // 2. Create assistant for this organization
  const assistant = await createVapiAssistant(organizationId);
  
  // 3. Store in database
  await supabase.from('phone_numbers').insert({
    organization_id: organizationId,
    phone_number: number,
    vapi_phone_number_id: id,
    vapi_assistant_id: assistant.id
  });
  
  return { number, id };
}
```

**3. Webhook Routing**
Update `app/api/vapi-webhook/route.ts`:
```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const phoneNumber = body.call?.to || body.phoneNumber;
  
  // Look up organization by phone number
  const { data } = await supabase
    .from('phone_numbers')
    .select('organization_id')
    .eq('phone_number', phoneNumber)
    .single();
  
  // Set tenant context
  await setTenantContext(data.organization_id);
  
  // Process webhook with tenant context
  // ...
}
```

**4. Phone Number Management UI**
Create `components/phone-number-manager.tsx`:
- Show current phone number
- Button to provision new number
- Release number option
- Configure settings

**Files to Create:**
- `lib/vapi-tenant.ts`
- `app/api/phone-numbers/provision/route.ts`
- `app/api/phone-numbers/[id]/route.ts`
- `components/phone-number-manager.tsx`

**Testing:**
- [ ] Provision phone number
- [ ] Webhooks route to correct tenant
- [ ] Multiple tenants work simultaneously
- [ ] Release number works

---

## Phase 13: Admin Panel & Email Notifications

### Objective
Admin can manage system, users get emails.

### Admin Panel

**1. Admin Routes**
Create `app/admin/page.tsx`:
- List all organizations
- View usage per org
- Suspend/activate tenants
- System health metrics

**2. Admin Middleware**
Create `middleware-admin.ts`:
```typescript
export async function adminMiddleware(req: Request) {
  const session = await getSession(req);
  if (session.user.role !== 'admin') {
    return NextResponse.redirect('/dashboard');
  }
}
```

### Email Service

**1. Install Resend**
```bash
npm install resend
```

**2. Email Templates**
Create `lib/email-templates.ts`:
```typescript
export const templates = {
  welcome: (name: string) => ({
    subject: 'Welcome to Zoid AI',
    html: `<h1>Welcome ${name}!</h1>...`
  }),
  usageAlert: (usage: number, limit: number) => ({
    subject: 'Usage Alert',
    html: `You've used ${usage}/${limit}...`
  })
};
```

**3. Email Sender**
Create `lib/email.ts`:
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, template: string, data: any) {
  const { subject, html } = templates[template](data);
  await resend.emails.send({
    from: 'noreply@zoid.ai',
    to,
    subject,
    html
  });
}
```

**Files to Create:**
- `app/admin/page.tsx`
- `lib/email.ts`
- `lib/email-templates.ts`
- `app/api/admin/*` (admin API routes)

**Testing:**
- [ ] Admin can view all orgs
- [ ] Admin can suspend tenant
- [ ] Emails send successfully
- [ ] Usage alerts work

---

## Phase 14: MVP Ready Checklist

### Technical Requirements
- [ ] Deployed to production URL
- [ ] Multi-tenancy working
- [ ] User auth working
- [ ] Payment system working
- [ ] Per-tenant phone numbers
- [ ] Email notifications
- [ ] Admin panel functional

### Business Requirements
- [ ] Sign-up flow tested
- [ ] Free tier working
- [ ] Upgrade flow working
- [ ] Usage limits enforced
- [ ] Support contact available

### Testing
- [ ] End-to-end user journey
- [ ] Multiple concurrent users
- [ ] Load testing (50+ users)
- [ ] Security audit

---

## Implementation Order

**Week 1-2: Phase 8 (Deployment)**
- Deploy to Vercel
- Configure production env
- Test production setup

**Week 3-4: Phase 9 (Multi-Tenancy)**
- Database schema changes
- RLS policies
- Update all queries
- Test data isolation

**Week 5-6: Phase 10 (Auth)**
- NextAuth setup
- Sign-up/login flows
- Protected routes
- Test auth flow

**Week 7-8: Phase 11 (Payments)**
- Stripe integration
- Usage tracking
- Billing dashboard
- Test payment flow

**Week 9-10: Phase 12 (Phone Provisioning)**
- Vapi tenant setup
- Phone provisioning
- Webhook routing
- Test multi-tenant calls

**Week 11-12: Phase 13 (Admin & Email)**
- Admin panel
- Email integration
- Notifications
- Final testing

**Total Timeline: 12 weeks (3 months)**

---

## Critical Success Factors

1. **Database Migrations:** Use migration scripts, test thoroughly
2. **Data Isolation:** RLS is critical for security
3. **Webhook Routing:** Must route to correct tenant
4. **Usage Tracking:** Must be accurate for billing
5. **Error Handling:** Graceful failures throughout

---

## Post-MVP Priorities

1. **Analytics:** Comprehensive usage analytics
2. **Performance:** Caching, optimization
3. **Features:** Human handoff, tool use
4. **Scale:** Load balancing, CDN
5. **Support:** Help docs, tutorials

---

## Alternative: Customer Discovery First

Before building all this infrastructure, consider:

1. Find 2-3 pilot customers
2. Manually set them up (no self-service needed)
3. Validate they'll actually pay
4. Then build infrastructure

See `BUSINESS_STRATEGY.md` for customer discovery approach.

---

**This plan provides a complete roadmap from current state to production-ready MVP. Follow phases sequentially for best results.**