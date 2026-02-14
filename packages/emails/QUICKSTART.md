# Quick Start Guide - @bunship/emails

Get up and running with BunShip email templates in 5 minutes.

## 1. Preview Templates (Development)

Start the React Email dev server to preview all templates:

```bash
cd packages/emails
bun run dev
```

Visit **http://localhost:3000** to see all templates in action.

## 2. Install Resend

Add Resend to your backend package:

```bash
cd packages/api
bun add resend
```

## 3. Set Environment Variables

Add to your `.env` file:

```bash
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@bunship.com
APP_URL=https://app.bunship.com
```

## 4. Create Email Service

Create `/home/webby/projects_2026/bunship/packages/api/src/lib/email.ts`:

```typescript
import { Resend } from "resend";
import { renderEmail } from "@bunship/emails";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) {
  const html = await renderEmail(template);

  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to,
    subject,
    html,
  });

  return result;
}
```

## 5. Send Your First Email

Example: Send welcome email on user registration

```typescript
import { WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

// In your registration handler
await sendEmail({
  to: user.email,
  subject: "Welcome to BunShip! 🚀",
  template: (
    <WelcomeEmail
      name={user.name}
      dashboardUrl={`${process.env.APP_URL}/dashboard`}
    />
  ),
});
```

## 6. Common Use Cases

### Send Verification Email

```typescript
import { VerifyEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

const token = generateVerificationToken(); // Your token generation

await sendEmail({
  to: user.email,
  subject: "Verify your email address",
  template: (
    <VerifyEmail
      name={user.name}
      verificationUrl={`${process.env.APP_URL}/verify?token=${token}`}
      resendUrl={`${process.env.APP_URL}/resend-verification`}
    />
  ),
});
```

### Send Password Reset

```typescript
import { ResetPasswordEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

const token = generateResetToken(); // Your token generation

await sendEmail({
  to: user.email,
  subject: "Reset your password",
  template: (
    <ResetPasswordEmail
      name={user.name}
      resetUrl={`${process.env.APP_URL}/reset-password?token=${token}`}
    />
  ),
});
```

### Send Team Invitation

```typescript
import { TeamInviteEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

const token = generateInviteToken(); // Your token generation

await sendEmail({
  to: inviteeEmail,
  subject: `${inviterName} invited you to join ${orgName}`,
  template: (
    <TeamInviteEmail
      inviteeName={inviteeName}
      inviterName={inviterName}
      organizationName={orgName}
      role="Developer"
      inviteUrl={`${process.env.APP_URL}/accept-invite?token=${token}`}
    />
  ),
});
```

### Send Invoice

```typescript
import { InvoiceEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

await sendEmail({
  to: user.email,
  subject: `Invoice ${invoiceNumber} - ${planName}`,
  template: (
    <InvoiceEmail
      name={user.name}
      invoiceNumber="INV-2024-001"
      amount="49.00"
      currency="USD"
      planName="Pro Plan"
      billingPeriod="Jan 1 - Jan 31, 2024"
      paymentDate="January 1, 2024"
      invoiceUrl={`${process.env.APP_URL}/invoices/${invoiceId}`}
      portalUrl={`${process.env.APP_URL}/billing`}
    />
  ),
});
```

## 7. Background Jobs (Recommended)

For better reliability, send emails via Inngest:

```typescript
// packages/api/src/inngest/functions/emails.ts
import { inngest } from "../client";
import { WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../../lib/email";

export const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email", retries: 3 },
  { event: "user.registered" },
  async ({ event }) => {
    await sendEmail({
      to: event.data.email,
      subject: "Welcome to BunShip! 🚀",
      template: (
        <WelcomeEmail
          name={event.data.name}
          dashboardUrl={`${process.env.APP_URL}/dashboard`}
        />
      ),
    });
  }
);
```

Trigger the job:

```typescript
await inngest.send({
  name: "user.registered",
  data: { name: user.name, email: user.email },
});
```

## 8. Testing

### Send Test Email

```typescript
// packages/api/src/scripts/test-email.ts
import { WelcomeEmail } from "@bunship/emails";
import { sendEmail } from "../lib/email";

await sendEmail({
  to: "your-email@example.com",
  subject: "Test: Welcome Email",
  template: (
    <WelcomeEmail
      name="Test User"
      dashboardUrl="https://app.bunship.com/dashboard"
    />
  ),
});

console.log("Test email sent!");
```

Run:

```bash
bun run packages/api/src/scripts/test-email.ts
```

## 9. Utility Functions

Format currency, dates, and more:

```typescript
import { formatCurrency, formatDate, addUTMToUrl } from "@bunship/emails";

// Format currency
const price = formatCurrency(4900, "USD"); // "$49.00"

// Format date
const date = formatDate(new Date(), { month: "long", day: "numeric" }); // "January 28"

// Add tracking
const url = addUTMToUrl("https://app.bunship.com/dashboard", "email", "welcome-email");
// "https://app.bunship.com/dashboard?utm_source=email&utm_medium=welcome-email"
```

## 10. Error Handling

Always handle email failures gracefully:

```typescript
try {
  await sendEmail({
    to: user.email,
    subject: "Welcome!",
    template: <WelcomeEmail name={user.name} dashboardUrl={url} />,
  });
} catch (error) {
  console.error("Failed to send email:", error);
  // Log to monitoring service (Sentry, LogRocket, etc.)
  // Don't block user actions on email failures
}
```

## Next Steps

- 📖 Read [INTEGRATION.md](./INTEGRATION.md) for detailed integration guide
- 📝 Review [README.md](./README.md) for complete documentation
- 🎨 Customize templates in `src/templates/` to match your brand
- 🔍 Monitor email delivery and engagement in Resend dashboard

## Troubleshooting

**Emails not sending?**

- Verify `RESEND_API_KEY` is set correctly
- Check sender domain is verified in Resend
- Review Resend logs for errors

**Emails in spam?**

- Set up SPF, DKIM, and DMARC records
- Use verified domain for sender address
- Avoid spam trigger words

**Styling issues?**

- Preview in dev server first: `bun run dev`
- Test in actual email client
- Check React Email docs for limitations

## Support

- 📚 [React Email Documentation](https://react.email/docs)
- 🔧 [Resend Documentation](https://resend.com/docs)
- 💬 [BunShip Repository](https://github.com/yourusername/bunship)

---

**You're ready to go!** 🚀

Start by previewing templates (`bun run dev`) and sending test emails.
