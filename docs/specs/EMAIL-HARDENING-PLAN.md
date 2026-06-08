# Email Hardening Plan — Production-Ready Email Service

**Status**: REQUIRED BEFORE LAUNCH 🚨
**Effort**: 4-6 hours (implementation + testing)
**Priority**: CRITICAL (Blocker #2)

---

## Current State: Problems

### 1. **Nodemailer SMTP with Weak Credentials**

```
Current: ❌ Nodemailer with hardcoded SMTP creds
Issues:
- Credentials in .env (exposed in git history)
- SMTP relay through generic provider
- No reputation/deliverability guarantees
- High bounce/spam rates likely
- No DomainKeys, SPF, DKIM, DMARC configured
```

### 2. **Domain: digitaldsa.com**

```
Current: ❌ No email authentication setup
Missing:
- SPF record (Sender Policy Framework)
- DKIM keys (DomainKeys Identified Mail)
- DMARC policy (Domain-based Message Authentication, Reporting and Conformance)
- PTR records (reverse DNS for sending IPs)
```

### 3. **Files Affected**

- `src/lib/server/email.ts` — Email sending logic (Nodemailer)
- `.env.local` — SMTP credentials (exposed)
- `.env` (git history) — 19 commits with hardcoded creds

---

## Solution: AWS SES or SendGrid

### Option A: AWS SES (Simple Email Service) ✅ RECOMMENDED

**Pros**:

- Extremely reliable (99.99% uptime)
- Cheap ($0.10 per 1000 emails)
- Built-in DKIM/SPF signing
- Integrated with AWS IAM
- Sandbox → Production mode (reputation verified)
- Bounce/complaint tracking
- Sending limits (scalable)

**Cons**:

- Requires AWS account
- Need to verify domain + email addresses
- Warmup period (increase sending limits gradually)
- Slightly more complex SDK

### Option B: SendGrid

**Pros**:

- Easy onboarding
- Free tier (100 emails/day)
- Excellent documentation
- Real-time analytics

**Cons**:

- Pay-as-you-go ($0.10-$0.50 per email at scale)
- Less control over infrastructure

### **Decision**: AWS SES (lower cost, more control)

---

## Implementation Steps

### Phase 1: AWS Setup (30 mins)

#### 1.1 Create AWS Account (if needed)

```bash
# If no AWS account yet, create one at https://aws.amazon.com
# Set up IAM user with SES permissions
```

#### 1.2 Verify Domain in SES

```bash
# AWS Console → SES → Verified Identities
# Add digitaldsa.com
# AWS provides TXT records for domain verification
```

**DNS Records to Add** (provided by AWS):

```
Type: TXT
Name: _amazonses.digitaldsa.com
Value: [AWS-provided verification string]
```

#### 1.3 Create SES SMTP Credentials

```bash
# AWS Console → SES → SMTP Settings
# Create SMTP username + password
# Note the SMTP server: email-smtp.region.amazonaws.com
```

---

### Phase 2: Setup Email Authentication (45 mins)

#### 2.1 Add SPF Record (Sender Policy Framework)

```dns
Type: TXT
Name: digitaldsa.com (or @ for root)
Value: v=spf1 include:amazonses.com ~all
```

**Why SPF?**

- Tells receivers: "Only these servers can send mail as @digitaldsa.com"
- Prevents spoofing
- Increases deliverability

#### 2.2 Enable DKIM (DomainKeys Identified Mail)

```bash
# AWS Console → SES → DKIM Settings
# Click "Generate DKIM Settings"
# AWS provides 3 CNAME records to add to DNS
```

**DNS Records** (3 CNAMEs, provided by AWS):

```
Name: [token1]._domainkey.digitaldsa.com
Value: [token1].dkim.amazonses.com

Name: [token2]._domainkey.digitaldsa.com
Value: [token2].dkim.amazonses.com

Name: [token3]._domainkey.digitaldsa.com
Value: [token3].dkim.amazonses.com
```

**Why DKIM?**

- Cryptographically signs emails
- Proves: "This email really came from us"
- Highest deliverability boost

#### 2.3 Add DMARC Policy

```dns
Type: TXT
Name: _dmarc.digitaldsa.com
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@digitaldsa.com; ruf=mailto:dmarc-forensics@digitaldsa.com; fo=1
```

**Configuration**:

- `p=quarantine` — Receivers quarantine unauthenticated emails (not reject, more lenient)
- `rua=...` — Daily reports to this address (helps you monitor)
- `ruf=...` — Forensics reports for failures
- `fo=1` — Report on any DKIM/SPF failure

**Why DMARC?**

- Policy layer on top of SPF + DKIM
- Tells receivers what to do with failed emails
- Provides feedback loop

#### 2.4 Verify Sending Email Address

```bash
# AWS Console → SES → Verified Identities
# Add sender email address (e.g., noreply@digitaldsa.com)
# Click verification link in email
```

---

### Phase 3: Code Changes (1.5 hours)

#### 3.1 Update Email Service

**File**: `src/lib/server/email.ts`

Replace Nodemailer SMTP with AWS SES SDK:

```typescript
// OLD (Nodemailer SMTP)
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT,
	auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// NEW (AWS SES)
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION });

export async function sendEmail(to: string, subject: string, html: string) {
	const params = {
		Source: process.env.SES_FROM_EMAIL, // noreply@digitaldsa.com
		Destination: { ToAddresses: [to] },
		Message: {
			Subject: { Data: subject },
			Body: { Html: { Data: html } }
		}
	};

	try {
		await sesClient.send(new SendEmailCommand(params));
		return { success: true };
	} catch (err) {
		logger.error('SES send failed', { error: err, to, subject });
		return { success: false, error: err.message };
	}
}
```

#### 3.2 Update .env.local

```bash
# REMOVE these (they're exposed in git):
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=

# ADD these:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE  # IAM user key
AWS_SECRET_ACCESS_KEY=[secret]           # IAM user secret
SES_FROM_EMAIL=noreply@digitaldsa.com
```

#### 3.3 Update package.json

```bash
# Remove nodemailer (if only used for email)
npm uninstall nodemailer

# Add AWS SDK
npm install @aws-sdk/client-ses
```

#### 3.4 Error Handling & Logging

```typescript
// Track bounces/complaints
export async function handleSESBounce(event: any) {
	const message = JSON.parse(event.Records[0].Sns.Message);

	if (message.eventType === 'Bounce') {
		const { bounceType, bounceSubType, bounceRecipients } = message.bounce;
		logger.warn('Email bounce', { bounceType, bounceSubType, bounceRecipients });

		if (bounceType === 'Permanent') {
			// Mark email as invalid in database
			await markEmailInvalid(bounceRecipients[0].emailAddress);
		}
	}
}
```

---

### Phase 4: Testing (1.5 hours)

#### 4.1 Unit Tests

```typescript
// tests/email.test.ts
describe('sendEmail', () => {
	test('sends email via SES', async () => {
		const result = await sendEmail('test@example.com', 'Test Subject', '<p>Test body</p>');
		expect(result.success).toBe(true);
	});

	test('handles SES errors gracefully', async () => {
		// Mock SES failure
		const result = await sendEmail('invalid@test.local', 'Subject', 'Body');
		expect(result.success).toBe(false);
	});
});
```

#### 4.2 Manual Testing

```bash
# 1. Verify SPF record propagates (wait 24h)
# nslookup -type=TXT digitaldsa.com
# Should see: v=spf1 include:amazonses.com ~all

# 2. Verify DKIM enabled
# nslookup -type=CNAME [token]._domainkey.digitaldsa.com
# Should resolve to amazonses

# 3. Verify DMARC policy
# nslookup -type=TXT _dmarc.digitaldsa.com
# Should see: v=DMARC1; p=quarantine...

# 4. Send test email
curl -X POST http://localhost:5173/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-personal-email@gmail.com"}'

# 5. Check Gmail headers (right-click → Show original)
# Should see:
# - SPF: PASS
# - DKIM: PASS
# - DMARC: PASS
```

#### 4.3 Email Testing Tools

- **Mail Tester** (https://www.mail-tester.com/) — Get score + feedback
- **DMARC Monitoring** — AWS provides free reports
- **250ok** or **SendGrid** tools — Check deliverability

---

### Phase 5: Rollout & Monitoring (1 hour)

#### 5.1 Sandbox → Production Mode

```bash
# AWS Console → SES → Account Dashboard
# Click "Request Production Access"
# Explain use case: DigitalDSA loan application platform
# Wait for approval (usually 24 hours)
```

#### 5.2 Sending Limits

- **Sandbox**: Max 1 email/second, 200 emails/24h (only to verified addresses)
- **Production**: Gradually increase limits (start 1/sec, scale to 10-100/sec)

```bash
# AWS Console → SES → Account Dashboard → Sending Limits
# Request increase: 100/second
# AWS will review based on bounce rate + complaints
```

#### 5.3 Bounce Handling

```typescript
// Set up SNS → Lambda to auto-handle bounces
// AWS Console → SNS → Create Topic → digitaldsa-ses-bounces
// SES → Configuration Set → Event Destinations → SNS

// Lambda function triggers on bounce, marks email invalid
```

#### 5.4 Monitoring

```typescript
// Log every send attempt
logger.info('Email sent', {
	to,
	subject,
	messageId,
	timestamp: new Date().toISOString()
});

// Track failures
logger.error('Email send failed', {
	to,
	subject,
	error: err.message,
	code: err.code // e.g., "MessageRejected", "ConfigurationSetDoesNotExist"
});
```

---

## Deliverables Checklist

### DNS Configuration

- [ ] SPF record added to digitaldsa.com
- [ ] DKIM records (3 CNAMEs) added
- [ ] DMARC policy record added
- [ ] All records verified (nslookup)

### AWS Setup

- [ ] SES verified domain (digitaldsa.com)
- [ ] SES verified sender email (noreply@digitaldsa.com)
- [ ] IAM user created with SES permissions
- [ ] AWS credentials in .env.local

### Code Changes

- [ ] `src/lib/server/email.ts` updated to use AWS SDK
- [ ] Removed Nodemailer dependency
- [ ] Error handling + logging in place
- [ ] Unit tests written

### Testing

- [ ] SPF/DKIM/DMARC verification passes
- [ ] Test email sent to personal email (check headers)
- [ ] Mail Tester score ≥ 8/10
- [ ] Bounce handling configured

### Documentation

- [ ] Email hardening guide in docs/
- [ ] Sendgrid/SES comparison documented
- [ ] Runbook for troubleshooting bounces

---

## Estimated Timeline

| Phase     | Task                            | Hours         | Notes                                    |
| --------- | ------------------------------- | ------------- | ---------------------------------------- |
| 1         | AWS setup + domain verification | 0.5           | Can parallelize with code                |
| 2         | DNS records (SPF/DKIM/DMARC)    | 0.75          | May need to wait for DNS propagation     |
| 3         | Code changes (email service)    | 1.5           | AWS SDK integration + error handling     |
| 4         | Testing + verification          | 1.5           | Includes mail tester, sandbox testing    |
| 5         | Monitoring + prod promotion     | 1             | SES production access + limits           |
| **TOTAL** |                                 | **5-6 hours** | Can compress to 3-4 with parallelization |

---

## Cost Estimate

### AWS SES Pricing

- **Sending**: $0.10 per 1000 emails = $0.0001/email
- **Incoming**: Free
- **Attachments**: $0.12 per GB
- **Free tier**: 62,000 emails/month for first 12 months

### Example Costs

- 10,000 emails/month: ~$1
- 1M emails/month: ~$100
- Well below any other provider

---

## Rollback Plan

If SES fails after launch:

1. **Temporary**: Switch back to Nodemailer SMTP (but update creds first)
2. **Quick**: SendGrid (API key, no DNS changes needed)
3. **Long-term**: Fix and re-enable SES

```typescript
// Fallback in email.ts
try {
	// Try SES first
	return await sendViaSES(to, subject, html);
} catch (err) {
	logger.error('SES failed, falling back to SendGrid', { error: err });
	// Fallback to SendGrid API
	return await sendViaSendGrid(to, subject, html);
}
```

---

## Security Notes

### Private Keys & Credentials

- **AWS Keys**: Store in .env.local (never commit)
- **SMTP Creds**: Delete old ones (git history cleaned separately)
- **DKIM**: Private keys managed by AWS (no manual secrets)

### Rate Limiting

- **SES Sandbox**: 1 email/second max (auto-throttled)
- **SES Production**: Start at 1/second, scale gradually
- **Implement queue**: Use Bull/BullMQ to throttle send requests

---

## References

- **AWS SES Guide**: https://docs.aws.amazon.com/ses/
- **DMARC Explained**: https://dmarcian.com/
- **Mail Tester**: https://www.mail-tester.com/
- **Email Authentication Best Practices**: RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC)

---

## Next Steps

1. **Immediate**: Create AWS account + verify domain (30 mins)
2. **Add DNS records** (45 mins, wait 24h for propagation)
3. **Update code** (1.5 hours)
4. **Test thoroughly** (1.5 hours)
5. **Deploy to production** (1 hour)

**Total**: 5-6 hours of work, but critical for production launch.
