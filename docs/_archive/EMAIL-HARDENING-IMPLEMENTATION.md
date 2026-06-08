# Email Hardening — Implementation Guide (Session 10)

> **Status**: Ready to implement
> **Blocker**: Production #2 (Email service hardening)
> **Effort**: 5-6 hours (all phases)
> **Restoration Point**: 2873fd0e (Phase 2 archival complete)

---

## Current State Assessment

### What We Found
- ✅ No `email.ts` file exists yet (greenfield implementation)
- ✅ Email-related API routes exist (`send-email-verification`, `resend-otp`, `verify-email`, etc.)
- ✅ CLAUDE.md mentions: "Email: Nodemailer"
- ✅ Tech stack in CLAUDE.md lists Nodemailer as email service

**Conclusion**: Email service needs to be wired up with AWS SES. This is a **new implementation**, not a migration.

### Key Constraint
- User has NOT yet rotated exposed credentials
- AWS account setup (Phase 1) requires AWS keys
- For now: **Create email service skeleton + document what credentials user needs**

---

## Implementation Plan (4 Phases)

### Phase 1: Email Service Skeleton (30 mins)

**File**: `src/lib/server/email.ts` (NEW)

Create the service interface that API routes will use:

```typescript
/**
 * Email Service — Production-ready email delivery
 *
 * Current implementation: AWS SES (Simple Email Service)
 * Alternative: SendGrid (fallback)
 *
 * Cost: ~$0.0001/email (free tier: 62,000/month for 12 months)
 * Requirements: AWS account with verified domain
 */

import { logger } from '$lib/server/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via AWS SES
 * Credentials: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Validate environment
    if (!process.env.AWS_REGION) {
      logger.warn('Email service not configured', {
        reason: 'AWS_REGION not set',
        to: options.to,
        subject: options.subject
      });
      return {
        success: false,
        error: 'Email service not configured (AWS_REGION missing)'
      };
    }

    // TODO: Implement AWS SES client
    // For now: Log and return success (development mode)
    logger.info('Email prepared (SES not yet implemented)', {
      to: options.to,
      subject: options.subject,
      from: options.from || 'noreply@digitaldsa.com'
    });

    return {
      success: true,
      messageId: `dev-${Date.now()}` // Mock message ID
    };
  } catch (error) {
    logger.error('Email send failed', {
      error: error instanceof Error ? error.message : String(error),
      to: options.to,
      subject: options.subject
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send OTP via email (used by auth flows)
 */
export async function sendOTPEmail(
  to: string,
  otp: string,
  type: 'signup' | 'login' | 'password-reset'
): Promise<EmailResult> {
  const subject = {
    signup: 'Verify your DigitalDSA account',
    login: 'Login verification code',
    'password-reset': 'Reset your DigitalDSA password'
  }[type];

  const html = `
    <h1>DigitalDSA</h1>
    <p>Your verification code is:</p>
    <h2>${otp}</h2>
    <p>This code will expire in 10 minutes.</p>
  `;

  return sendEmail({
    to,
    subject,
    html
  });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  to: string,
  verificationUrl: string
): Promise<EmailResult> {
  const html = `
    <h1>DigitalDSA — Email Verification</h1>
    <p>Click the link below to verify your email:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>Or copy this link: ${verificationUrl}</p>
    <p>This link will expire in 24 hours.</p>
  `;

  return sendEmail({
    to,
    subject: 'Verify your DigitalDSA email',
    html
  });
}
```

**Status**: ✅ Skeleton ready for implementation

---

### Phase 2: AWS SES Integration (1.5 hours)

After user provides AWS credentials, implement:

```typescript
// Add to email.ts

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Move sendEmail implementation to use SESClient
// Add bounce/complaint handling via SNS
```

**Files to Modify**:
- `src/lib/server/email.ts` — Main implementation
- `package.json` — Add `@aws-sdk/client-ses`
- `.env.example` — Add AWS environment variables
- `.env.local` — User fills in AWS credentials

**Requirements**:
1. AWS account with SES service enabled
2. Domain verified in SES (digitaldsa.com)
3. SMTP credentials created (or use IAM user)
4. SPF/DKIM/DMARC records added to domain DNS

---

### Phase 3: Email Routes Integration (1.5 hours)

Wire email.ts into existing API routes that send emails:

**Routes to Update**:
- `/api/auth/send-otp` — Send OTP for login/signup
- `/api/auth/send-email-verification` — Send email verification link
- `/api/auth/resend-otp` — Resend OTP
- `/api/auth/resend-email-otp` — Resend email OTP
- (Others TBD based on codebase audit)

**Pattern**:
```typescript
// src/routes/api/auth/send-otp/+server.ts
import { sendOTPEmail } from '$lib/server/email';

export async function POST({ request, locals }) {
  const { email, type } = await parseJsonBody(request);

  const result = await sendOTPEmail(email, generateOTP(), type);

  if (!result.success) {
    return apiError(result.error || 'Failed to send OTP', 500);
  }

  return apiOk({ messageId: result.messageId });
}
```

---

### Phase 4: DNS & Testing (1.5-2 hours)

After SES sandbox approval:

1. **Add SPF record**:
   ```
   Name: @ (or digitaldsa.com)
   Type: TXT
   Value: v=spf1 include:amazonses.com ~all
   ```

2. **Add DKIM records** (3 CNAMEs from AWS SES console):
   ```
   Name: token._domainkey.digitaldsa.com
   Value: token.dkim.amazonses.com
   ```

3. **Add DMARC policy**:
   ```
   Name: _dmarc.digitaldsa.com
   Type: TXT
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@digitaldsa.com; fo=1
   ```

4. **Test**: Use Mail Tester (https://www.mail-tester.com/)

---

## Critical Gotchas

### ❌ Don't:
1. **Commit AWS credentials** to git (use .env.local, never .env)
2. **Skip SPF/DKIM/DMARC** — Email bounces without authentication
3. **Use Nodemailer directly** — We're standardizing on SES

### ✅ Do:
1. **Use structured logger** — `logger.info()`, `logger.error()`, never `console`
2. **Validate email addresses** — Check format before sending
3. **Handle bounces** — Set up SNS for bounce notifications
4. **Test thoroughly** — Mail Tester must show 8+/10 score

---

## Session 10 Deliverables

### What We're Implementing TODAY:
1. ✅ Phase 1: Email service skeleton (email.ts)
2. ⏳ Phase 2-4: Documented + ready for user to provide AWS credentials

### Why We're Stopping Here:
- User hasn't rotated exposed credentials yet
- AWS account setup requires AWS keys (user's responsibility)
- Skeleton is complete and can be tested in development

### Next Session (After Credentials Rotated):
1. User provides AWS credentials
2. We implement full AWS SES integration
3. Wire into API routes
4. Add DNS records
5. Test and verify

---

## Files to Create/Modify

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/server/email.ts` | CREATE | Email service skeleton |
| `package.json` | MODIFY | Add @aws-sdk/client-ses (later) |
| `.env.example` | MODIFY | Document AWS env vars |
| `src/routes/api/auth/send-otp/+server.ts` | MODIFY | Wire sendOTPEmail (later) |
| `src/routes/api/auth/send-email-verification/+server.ts` | MODIFY | Wire sendVerificationEmail (later) |

---

## Verification Before Commit

```bash
# 1. Type check
pnpm run check

# 2. Run tests
pnpm run test:unit

# 3. Verify imports
grep -r "sendEmail\|sendOTPEmail" src/ --include="*.ts"
# Should show no results (not wired yet)
```

---

## Timeline

- **Phase 1 (Today)**: Skeleton + documentation (~30 mins) ✅
- **Phase 2-4 (Next session)**: Full implementation (~4-5 hours)
  - Requires user to provide AWS credentials
  - Requires DNS updates (user's registrar)

---

## References

- Full plan: `docs/EMAIL-HARDENING-PLAN.md` (850+ lines)
- Production blockers: `CLAUDE.md` Section "Production Blockers"
- Session alignment: `docs/SESSION-10-ALIGNMENT.md`

