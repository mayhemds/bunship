/**
 * Example usage of all email templates
 * These examples can be used for testing and preview
 */

import {
  WelcomeEmail,
  VerifyEmail,
  ResetPasswordEmail,
  TeamInviteEmail,
  InvoiceEmail,
  SubscriptionCanceledEmail,
} from "./index";

// Welcome Email Example
export const WelcomeExample = () => (
  <WelcomeEmail name="Sarah Johnson" dashboardUrl="https://app.bunship.com/dashboard" />
);

// Verify Email Example
export const VerifyEmailExample = () => (
  <VerifyEmail
    name="Sarah Johnson"
    verificationUrl="https://app.bunship.com/verify?token=abc123xyz789"
    resendUrl="https://app.bunship.com/resend-verification"
  />
);

// Reset Password Example
export const ResetPasswordExample = () => (
  <ResetPasswordEmail
    name="Sarah Johnson"
    resetUrl="https://app.bunship.com/reset-password?token=reset123xyz"
  />
);

// Team Invite Example
export const TeamInviteExample = () => (
  <TeamInviteEmail
    inviteeName="Alex Martinez"
    inviterName="Sarah Johnson"
    organizationName="Acme Technologies"
    role="Developer"
    inviteUrl="https://app.bunship.com/accept-invite?token=inv456abc"
  />
);

// Invoice Example
export const InvoiceExample = () => (
  <InvoiceEmail
    name="Sarah Johnson"
    invoiceNumber="INV-2024-0042"
    amount="49.00"
    currency="USD"
    planName="Pro Plan"
    billingPeriod="January 1 - January 31, 2024"
    paymentDate="January 1, 2024"
    invoiceUrl="https://app.bunship.com/invoices/inv-2024-0042"
    portalUrl="https://app.bunship.com/billing"
  />
);

// Subscription Canceled Example
export const SubscriptionCanceledExample = () => (
  <SubscriptionCanceledEmail
    name="Sarah Johnson"
    planName="Pro Plan"
    accessEndDate="February 1, 2024"
    resubscribeUrl="https://app.bunship.com/resubscribe"
    feedbackUrl="https://app.bunship.com/feedback?reason=cancel"
  />
);

// Export all examples for the email dev server
export default {
  WelcomeExample,
  VerifyEmailExample,
  ResetPasswordExample,
  TeamInviteExample,
  InvoiceExample,
  SubscriptionCanceledExample,
};
