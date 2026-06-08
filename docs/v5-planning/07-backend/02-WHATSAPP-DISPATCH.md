---
type: backend
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# WhatsApp Dispatch — Gupshup Integration

## Provider choice

**Gupshup** is the chosen WhatsApp Business Solution Provider (BSP) for V5.

Why Gupshup:
- Indian company (data ops in India)
- Strong WhatsApp Business API coverage in India
- Template approval well-documented
- Integrates with MSG91 (already in our stack for OTP) cleanly

Alternative: **Karix**. We keep the adapter pattern so swapping is a config change.

## Architecture

```
DSA action (e.g., send doc request)
   ↓
ConversationsService.sendWhatsAppTemplate()
   ↓
BullMQ queue: whatsapp.outbound
   ↓
Worker picks up
   ↓
WhatsApp adapter (GupshupAdapter)
   ↓
Gupshup API: send template message
   ↓
Gupshup → Meta → Customer's WhatsApp
   ↓
Delivery status webhook
   ↓
Update ConversationEvent.delivery_status
   ↓
SSE push to DSA's open browser tab
```

## Outbound — templates

WhatsApp Business requires pre-approved templates for outbound messages outside the 24-hour session window. Free-form messages are allowed only within 24 hours of customer's last message.

### Template registry

`packages/messaging/src/whatsapp/templates.ts`:

```typescript
export const WA_TEMPLATES = {
  doc_request: {
    id: 'doc_request_v1',
    locales: {
      en: {
        body: 'Hi {{name}}, please upload {{docs}} for your {{loan_type}} application: {{link}}',
      },
      hi: {
        body: 'Namaste {{name}}, kripya {{docs}} upload kijiye yahan: {{link}}',
      },
      'hi-en': {
        body: 'Hi {{name}}, {{docs}} upload kar dijiye apne {{loan_type}} ke liye: {{link}}',
      },
    },
    variables: ['name', 'docs', 'loan_type', 'link'],
    approved_at: '2026-08-15',
  },
  status_update_sanctioned: { /* ... */ },
  status_update_disbursed: { /* ... */ },
  follow_up_call: { /* ... */ },
  // ...
};
```

Templates are submitted to Gupshup, then to Meta, for approval. Approval takes 1-3 days. Owner+Claude review template wording before submission for compliance (no promotional content in transactional templates).

## Dispatch flow

```typescript
class WhatsAppDispatcher {
  async dispatchTemplate(
    customerId: ObjectId,
    templateId: string,
    variables: Record<string, string>,
    by: User,
  ): Promise<ConversationEvent> {
    // 1. Load customer, decrypt mobile (audited)
    const customer = await customersRepo.findById(by.org_id, customerId);
    const mobile = await decryptor.decrypt(customer.mobile);

    // 2. Render template per customer's locale
    const template = WA_TEMPLATES[templateId];
    const locale = customer.preferred_locale ?? 'hi-en';
    const body = renderTemplate(template.locales[locale].body, variables);

    // 3. Create ConversationEvent (outbound, queued status)
    const event = await conversationsRepo.appendEvent({
      conversation_id: ...,
      channel: 'whatsapp',
      direction: 'outbound',
      actor_kind: 'dsa_user',
      actor_user_id: by._id,
      body_encrypted: await encrypt(body),
      template_id: templateId,
      template_variables: variables,
      delivery_status: 'queued',
    });

    // 4. Enqueue
    await whatsappQueue.add('send', {
      event_id: event._id,
      to_mobile: mobile,                // sensitive — only in queue payload briefly
      template_id: templateId,
      variables,
      locale,
    });

    return event;
  }
}
```

## Queue worker

```typescript
whatsappQueue.process('send', async (job) => {
  const { event_id, to_mobile, template_id, variables, locale } = job.data;

  const adapter = getWhatsAppAdapter();   // GupshupAdapter
  const result = await adapter.sendTemplate({
    to: to_mobile,
    template_id,
    variables,
    locale,
  });

  if (result.ok) {
    await conversationsRepo.updateEvent(event_id, {
      wa_message_id: result.wa_message_id,
      delivery_status: 'sent',
    });
  } else {
    await conversationsRepo.updateEvent(event_id, {
      delivery_status: 'failed',
      failure_reason: result.error,
    });
  }
});
```

Note: `to_mobile` lives in the queue payload briefly (TTL 1 hour). The Redis Mumbai server is where it sits. Job is purged after success.

## Inbound webhook

```
POST /api/webhooks/whatsapp/gupshup
Headers: X-Gupshup-Signature: <hmac>
Body: { type, payload: { from, message, ... } }
```

Handler:

```typescript
export async function POST({ request }) {
  const body = await request.arrayBuffer();
  if (!verifyGupshupSignature(body, request.headers.get('x-gupshup-signature'))) {
    return apiError('invalid_signature', null, 401);
  }
  const payload = JSON.parse(body.toString());

  if (payload.type === 'message') {
    await handleInboundMessage(payload);
  } else if (payload.type === 'delivery') {
    await handleDeliveryStatus(payload);
  }
  return apiOk({});
}

async function handleInboundMessage(payload) {
  const fromMobile = normaliseMobile(payload.from);
  const blindIndex = await blindIndex('mobile', fromMobile);

  // Cross-org: which DSA owns this customer?
  const customer = await db.collection('customers')
    .findOne({ 'mobile.blind_index': blindIndex });

  if (!customer) {
    // Unknown sender — log, drop, alert
    logger.warn({ blind_index: blindIndex }, 'whatsapp.inbound.unknown_sender');
    return;
  }

  const conversation = await conversationsService.findByCustomer(customer.org_id, customer._id);
  const body = payload.message.text ?? '[attachment]';

  await conversationsService.appendEvent(conversation._id, {
    channel: 'whatsapp',
    direction: 'inbound',
    actor_kind: 'customer',
    body_encrypted: await encrypt(body),
    attachments: await processAttachments(payload.message.attachments),
    wa_message_id: payload.message.id,
  });

  // Push notification to DSA
  await pushService.notify(conversation.org_id, customer.assigned_to_user_id ?? customer.created_by, {
    title: `New WhatsApp from ${maskedName(customer)}`,
    body: 'Tap to read',
    data: { conversation_id: conversation._id.toString() },
  });
}
```

## Secure upload links

When DSA requests documents from customer:

```typescript
async generateSecureUploadLink(customerId, expectedDocs, by): Promise<{ url, expires_at }> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);

  await secureUploadTokens.insertOne({
    token_hash: tokenHash,
    customer_id: customerId,
    expected_doc_kinds: expectedDocs,
    expires_at: addDays(new Date(), 7),
    used_at: null,
    created_by: by._id,
  });

  const url = `${PUBLIC_URL}/upload/${token}`;
  return { url, expires_at };
}
```

Customer taps link → mobile upload page (no app, no login) → uploaded file lands in vault + auto-attaches to expected case checklist item. Token is single-use, file-type-allowlisted, virus-scanned via ClamAV BullMQ job.

## Rate limits

| Limit | Default |
|---|---|
| Outbound templates per DSA per hour | 100 |
| Outbound templates per org per day | 1000 |
| Doc collection requests per customer per day | 3 |
| Embed widget submissions per builder per minute | 60 |

Configurable per plan.

## Cost economics

Gupshup charges per conversation (24h window) and per template. Cost roughly:
- Outbound template (transactional): ~₹0.50 per session
- Inbound: free
- Session messages within 24h: free

Estimated cost per DSA per month at average usage: ₹200-400. Built into plan pricing.

## Phase 2A vs Phase 2B

| Sprint | What's done |
|---|---|
| 2A Sprint 5 | Gupshup adapter, outbound templates (3 core: doc request, status updates, follow-up), inbound webhook, secure upload links |
| 2A Sprint 6+ | More templates added as needed |
| 2B Sprint 11 | Voice notes (Gupshup supports) |
| 2B Sprint 13 | In-app freeform messaging within 24h window |

## Related docs

- [01-API-CONVENTIONS.md](01-API-CONVENTIONS.md)
- [../05-domains/03-CONVERSATION.md](../05-domains/03-CONVERSATION.md)
- [../05-domains/06-DOCUMENT.md](../05-domains/06-DOCUMENT.md)
- [../09-sprints/V5-PHASE-2A/sprint-5-whatsapp.md](../09-sprints/V5-PHASE-2A/sprint-5-whatsapp.md)
