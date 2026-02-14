# @bunship/emails

React Email templates for BunShip SaaS platform.

## Features

- 📧 **6 Professional Email Templates**: Welcome, verification, password reset, team invites, invoices, and subscription management
- 🎨 **Consistent Design**: Shared layout component with branded header and footer
- 📱 **Responsive**: Works across all email clients and devices
- 🔒 **Type-Safe**: Full TypeScript support with prop interfaces
- ⚡ **Fast Rendering**: Built on React Email for optimal performance

## Templates

### 1. Welcome Email (`welcome.tsx`)

Sent after user registration.

```typescript
import { WelcomeEmail } from "@bunship/emails";

<WelcomeEmail
  name="John Doe"
  dashboardUrl="https://app.bunship.com/dashboard"
/>
```

### 2. Verify Email (`verify-email.tsx`)

Email address verification with token link.

```typescript
import { VerifyEmail } from "@bunship/emails";

<VerifyEmail
  name="John Doe"
  verificationUrl="https://app.bunship.com/verify?token=abc123"
  resendUrl="https://app.bunship.com/resend-verification"
/>
```

### 3. Reset Password (`reset-password.tsx`)

Password reset with secure token link.

```typescript
import { ResetPasswordEmail } from "@bunship/emails";

<ResetPasswordEmail
  name="John Doe"
  resetUrl="https://app.bunship.com/reset-password?token=xyz789"
/>
```

### 4. Team Invite (`team-invite.tsx`)

Organization team member invitation.

```typescript
import { TeamInviteEmail } from "@bunship/emails";

<TeamInviteEmail
  inviteeName="Jane Smith"
  inviterName="John Doe"
  organizationName="Acme Corp"
  role="developer"
  inviteUrl="https://app.bunship.com/accept-invite?token=inv123"
/>
```

### 5. Invoice (`invoice.tsx`)

Payment receipt and invoice notification.

```typescript
import { InvoiceEmail } from "@bunship/emails";

<InvoiceEmail
  name="John Doe"
  invoiceNumber="INV-2024-001"
  amount="49.00"
  currency="USD"
  planName="Pro Plan"
  billingPeriod="Jan 1 - Jan 31, 2024"
  paymentDate="January 1, 2024"
  invoiceUrl="https://app.bunship.com/invoices/inv-001"
  portalUrl="https://app.bunship.com/billing"
/>
```

### 6. Subscription Canceled (`subscription-canceled.tsx`)

Confirmation of subscription cancellation.

```typescript
import { SubscriptionCanceledEmail } from "@bunship/emails";

<SubscriptionCanceledEmail
  name="John Doe"
  planName="Pro Plan"
  accessEndDate="January 31, 2024"
  resubscribeUrl="https://app.bunship.com/resubscribe"
  feedbackUrl="https://app.bunship.com/feedback"
/>
```

## Usage

### Rendering Emails

```typescript
import { renderEmail, WelcomeEmail } from "@bunship/emails";

// Render to HTML
const html = await renderEmail(
  <WelcomeEmail
    name="John Doe"
    dashboardUrl="https://app.bunship.com/dashboard"
  />
);

// Send via email service (e.g., Resend)
await resend.emails.send({
  from: "noreply@bunship.com",
  to: "user@example.com",
  subject: "Welcome to BunShip!",
  html,
});
```

### Rendering Plain Text

```typescript
import { renderEmailText, WelcomeEmail } from "@bunship/emails";

const text = await renderEmailText(
  <WelcomeEmail
    name="John Doe"
    dashboardUrl="https://app.bunship.com/dashboard"
  />
);
```

### Development Preview

Preview emails in development mode:

```bash
bun run dev
```

This starts the React Email dev server at `http://localhost:3000` where you can preview all templates.

## Customization

### Modifying the Layout

Edit `/home/webby/projects_2026/bunship/packages/emails/src/components/Layout.tsx` to change:

- Brand logo and colors
- Header/footer content
- Global styles
- Font choices

### Adding New Templates

1. Create a new file in `/home/webby/projects_2026/bunship/packages/emails/src/templates/`
2. Define TypeScript props interface
3. Use the `<Layout>` component for consistency
4. Export from `/home/webby/projects_2026/bunship/packages/emails/src/index.ts`

Example:

```typescript
// templates/new-template.tsx
import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface NewTemplateProps {
  name: string;
  actionUrl: string;
}

export function NewTemplate({ name, actionUrl }: NewTemplateProps) {
  return (
    <Layout previewText="Preview text here">
      <Section>
        <Text style={heading}>Heading</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Button style={button} href={actionUrl}>
          Call to Action
        </Button>
      </Section>
    </Layout>
  );
}
```

## Email Client Compatibility

All templates are tested across major email clients:

- Gmail (Desktop & Mobile)
- Outlook (Desktop & Web)
- Apple Mail (macOS & iOS)
- Yahoo Mail
- Thunderbird

## Best Practices

1. **Keep it simple**: Email clients have limited CSS support
2. **Use tables for layout**: Most reliable across clients
3. **Inline styles**: Avoid external CSS
4. **Test thoroughly**: Use the dev preview before deploying
5. **Accessible**: Include alt text and semantic HTML
6. **Mobile-first**: Most users read email on mobile devices

## Scripts

```bash
# Start development server
bun run dev

# Build email templates
bun run build

# Type checking
bun run typecheck

# Lint code
bun run lint

# Clean build artifacts
bun run clean
```

## Tech Stack

- [React Email](https://react.email) - Email template framework
- [React](https://react.dev) - UI library
- [TypeScript](https://www.typescriptlang.org) - Type safety

## License

Part of the BunShip project.
