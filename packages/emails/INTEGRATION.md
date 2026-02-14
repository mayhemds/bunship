# Email Templates Integration Guide

This guide shows how to integrate `@bunship/emails` with the BunShip backend.

## Installation

The package is already part of the monorepo workspace. Import it in your backend code:

```typescript
import { renderEmail, WelcomeEmail } from "@bunship/emails";
```

## Integration with Resend

### Setup Resend Client

```typescript
// packages/api/src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL || "noreply@bunship.com",
    to,
    subject,
    html,
    text,
  });

  return result;
}
```

### Send Welcome Email

```typescript
// packages/api/src/services/auth/register.ts
import { renderEmail, renderEmailText, WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendWelcomeEmail(user: { name: string; email: string }) {
  const html = await renderEmail(
    <WelcomeEmail
      name={user.name}
      dashboardUrl={`${process.env.APP_URL}/dashboard`}
    />
  );

  const text = await renderEmailText(
    <WelcomeEmail
      name={user.name}
      dashboardUrl={`${process.env.APP_URL}/dashboard`}
    />
  );

  await sendEmail({
    to: user.email,
    subject: "Welcome to BunShip! 🚀",
    html,
    text,
  });
}
```

### Send Verification Email

```typescript
// packages/api/src/services/auth/verify.ts
import { renderEmail, VerifyEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendVerificationEmail(
  user: { name: string; email: string },
  token: string
) {
  const verificationUrl = `${process.env.APP_URL}/verify?token=${token}`;
  const resendUrl = `${process.env.APP_URL}/resend-verification`;

  const html = await renderEmail(
    <VerifyEmail
      name={user.name}
      verificationUrl={verificationUrl}
      resendUrl={resendUrl}
    />
  );

  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    html,
  });
}
```

### Send Password Reset Email

```typescript
// packages/api/src/services/auth/reset-password.ts
import { renderEmail, ResetPasswordEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendPasswordResetEmail(
  user: { name: string; email: string },
  token: string
) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

  const html = await renderEmail(
    <ResetPasswordEmail name={user.name} resetUrl={resetUrl} />
  );

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html,
  });
}
```

### Send Team Invite Email

```typescript
// packages/api/src/services/organizations/invite.ts
import { renderEmail, TeamInviteEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendTeamInviteEmail({
  inviteeEmail,
  inviteeName,
  inviterName,
  organizationName,
  role,
  token,
}: {
  inviteeEmail: string;
  inviteeName?: string;
  inviterName: string;
  organizationName: string;
  role: string;
  token: string;
}) {
  const inviteUrl = `${process.env.APP_URL}/accept-invite?token=${token}`;

  const html = await renderEmail(
    <TeamInviteEmail
      inviteeName={inviteeName || ""}
      inviterName={inviterName}
      organizationName={organizationName}
      role={role}
      inviteUrl={inviteUrl}
    />
  );

  await sendEmail({
    to: inviteeEmail,
    subject: `${inviterName} invited you to join ${organizationName}`,
    html,
  });
}
```

### Send Invoice Email

```typescript
// packages/api/src/services/billing/invoice.ts
import { renderEmail, InvoiceEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendInvoiceEmail(invoice: {
  userEmail: string;
  userName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  planName: string;
  billingPeriod: string;
  paymentDate: string;
  invoiceId: string;
}) {
  const invoiceUrl = `${process.env.APP_URL}/invoices/${invoice.invoiceId}`;
  const portalUrl = `${process.env.APP_URL}/billing`;

  const html = await renderEmail(
    <InvoiceEmail
      name={invoice.userName}
      invoiceNumber={invoice.invoiceNumber}
      amount={invoice.amount.toFixed(2)}
      currency={invoice.currency.toUpperCase()}
      planName={invoice.planName}
      billingPeriod={invoice.billingPeriod}
      paymentDate={invoice.paymentDate}
      invoiceUrl={invoiceUrl}
      portalUrl={portalUrl}
    />
  );

  await sendEmail({
    to: invoice.userEmail,
    subject: `Invoice ${invoice.invoiceNumber} - ${invoice.planName}`,
    html,
  });
}
```

### Send Subscription Canceled Email

```typescript
// packages/api/src/services/billing/cancel.ts
import { renderEmail, SubscriptionCanceledEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export async function sendSubscriptionCanceledEmail({
  userEmail,
  userName,
  planName,
  accessEndDate,
}: {
  userEmail: string;
  userName: string;
  planName: string;
  accessEndDate: string;
}) {
  const resubscribeUrl = `${process.env.APP_URL}/billing/resubscribe`;
  const feedbackUrl = `${process.env.APP_URL}/feedback?reason=cancel`;

  const html = await renderEmail(
    <SubscriptionCanceledEmail
      name={userName}
      planName={planName}
      accessEndDate={accessEndDate}
      resubscribeUrl={resubscribeUrl}
      feedbackUrl={feedbackUrl}
    />
  );

  await sendEmail({
    to: userEmail,
    subject: "Your subscription has been canceled",
    html,
  });
}
```

## Background Jobs with Inngest

For better reliability, send emails via background jobs:

```typescript
// packages/api/src/inngest/functions/send-email.ts
import { inngest } from "../client";
import { renderEmail, WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export const sendWelcomeEmailJob = inngest.createFunction(
  { id: "send-welcome-email", retries: 3 },
  { event: "user.registered" },
  async ({ event, step }) => {
    const { user } = event.data;

    await step.run("render-email", async () => {
      const html = await renderEmail(
        <WelcomeEmail
          name={user.name}
          dashboardUrl={`${process.env.APP_URL}/dashboard`}
        />
      );

      await sendEmail({
        to: user.email,
        subject: "Welcome to BunShip! 🚀",
        html,
      });
    });

    return { success: true };
  }
);
```

Trigger the job:

```typescript
// In your registration handler
await inngest.send({
  name: "user.registered",
  data: { user: { name, email } },
});
```

## Environment Variables

Add these to your `.env` file:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@bunship.com

# Application URLs
APP_URL=https://app.bunship.com
```

## Error Handling

Always wrap email sending in try-catch blocks:

```typescript
try {
  await sendEmail({ to, subject, html });
} catch (error) {
  console.error("Failed to send email:", error);
  // Log to monitoring service
  // Don't block user actions on email failures
}
```

## Testing

### Preview Emails Locally

```bash
cd packages/emails
bun run dev
```

Visit `http://localhost:3000` to preview all templates.

### Send Test Emails

```typescript
// packages/api/src/scripts/test-email.ts
import { renderEmail, WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

async function testWelcomeEmail() {
  const html = await renderEmail(
    <WelcomeEmail
      name="Test User"
      dashboardUrl="https://app.bunship.com/dashboard"
    />
  );

  await sendEmail({
    to: "test@example.com",
    subject: "Test: Welcome Email",
    html,
  });
}

testWelcomeEmail().catch(console.error);
```

Run:

```bash
bun run packages/api/src/scripts/test-email.ts
```

## Best Practices

1. **Always render both HTML and plain text versions**

   ```typescript
   const html = await renderEmail(<WelcomeEmail {...props} />);
   const text = await renderEmailText(<WelcomeEmail {...props} />);
   ```

2. **Use background jobs for non-critical emails**
   - Welcome emails, invoices, reports
   - Don't use for critical auth emails (verification, password reset)

3. **Implement retry logic**
   - Use Inngest's built-in retry mechanism
   - Or implement exponential backoff manually

4. **Log email events**
   - Track delivery, opens, clicks via Resend webhooks
   - Monitor bounce rates and spam complaints

5. **Handle unsubscribes**
   - Include unsubscribe links in marketing emails
   - Respect user preferences

6. **Test across email clients**
   - Use Litmus or Email on Acid for compatibility testing
   - Always preview in the React Email dev server first

## Monitoring

Track email metrics:

```typescript
// Log email events
await db.emailLogs.create({
  userId: user.id,
  template: "welcome",
  to: user.email,
  status: "sent",
  provider: "resend",
  messageId: result.id,
  sentAt: new Date(),
});
```

Monitor:

- Delivery rate
- Bounce rate
- Open rate (via tracking pixels)
- Click-through rate (via tracked links)
- Time to send

## Troubleshooting

### Emails not sending

1. Check Resend API key is valid
2. Verify sender domain is configured in Resend
3. Check rate limits
4. Review error logs

### Emails landing in spam

1. Set up SPF, DKIM, and DMARC records
2. Warm up your sending domain gradually
3. Avoid spam trigger words
4. Include unsubscribe links
5. Monitor sender reputation

### Styling issues

1. Use the React Email dev server for preview
2. Test in actual email clients
3. Keep CSS simple and inline
4. Use tables for layout
5. Avoid JavaScript and external resources

## Support

For issues with email templates:

- Check the [React Email documentation](https://react.email/docs)
- Review this integration guide
- Open an issue in the BunShip repository
