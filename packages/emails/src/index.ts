import { render } from "@react-email/components";

// Export all email templates
export { WelcomeEmail } from "./templates/welcome";
export type { WelcomeEmailProps } from "./templates/welcome";

export { VerifyEmail } from "./templates/verify-email";
export type { VerifyEmailProps } from "./templates/verify-email";

export { ResetPasswordEmail } from "./templates/reset-password";
export type { ResetPasswordEmailProps } from "./templates/reset-password";

export { TeamInviteEmail } from "./templates/team-invite";
export type { TeamInviteEmailProps } from "./templates/team-invite";

export { InvoiceEmail } from "./templates/invoice";
export type { InvoiceEmailProps } from "./templates/invoice";

export { SubscriptionCanceledEmail } from "./templates/subscription-canceled";
export type { SubscriptionCanceledEmailProps } from "./templates/subscription-canceled";

// Export layout component
export { Layout } from "./components/Layout";

// Export utilities
export * from "./utils";

/**
 * Render email template to HTML string
 * @param component - React Email component to render
 * @returns HTML string
 */
export async function renderEmail(component: React.ReactElement): Promise<string> {
  return render(component);
}

/**
 * Render email template to plain text
 * @param component - React Email component to render
 * @returns Plain text string
 */
export async function renderEmailText(component: React.ReactElement): Promise<string> {
  return render(component, { plainText: true });
}

/**
 * Email template collection for easy access
 */
export const emailTemplates = {
  welcome: "welcome",
  verifyEmail: "verify-email",
  resetPassword: "reset-password",
  teamInvite: "team-invite",
  invoice: "invoice",
  subscriptionCanceled: "subscription-canceled",
} as const;

export type EmailTemplate = (typeof emailTemplates)[keyof typeof emailTemplates];
