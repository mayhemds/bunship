/**
 * Email sending utilities using Resend
 */
import { Resend } from "resend";
import {
  renderEmail,
  WelcomeEmail,
  VerifyEmail,
  ResetPasswordEmail,
  TeamInviteEmail,
} from "@bunship/emails";
import { appConfig } from "@bunship/config";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY environment variable is required for email sending. " +
          "Set it in your .env file to enable emails."
      );
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendEmailOptions {
  to: string;
  template: "welcome" | "verify-email" | "reset-password" | "team-invite";
  data: Record<string, any>;
}

/**
 * Send an email using a template
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, template, data } = options;

  let component: React.ReactElement;
  let subject: string;

  switch (template) {
    case "welcome":
      component = WelcomeEmail({ name: data.name });
      subject = `Welcome to ${appConfig.name}!`;
      break;

    case "verify-email":
      component = VerifyEmail({
        name: data.name,
        verificationUrl: data.verificationUrl,
      });
      subject = "Verify your email address";
      break;

    case "reset-password":
      component = ResetPasswordEmail({
        name: data.name,
        resetUrl: data.resetUrl,
      });
      subject = "Reset your password";
      break;

    case "team-invite":
      component = TeamInviteEmail({
        inviterName: data.inviterName,
        organizationName: data.organizationName,
        inviteUrl: data.inviteUrl,
      });
      subject = `You've been invited to join ${data.organizationName}`;
      break;

    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  const html = await renderEmail(component);

  await getResend().emails.send({
    from: `${appConfig.name} <${process.env.RESEND_FROM_EMAIL ?? "noreply@bunship.com"}>`,
    to,
    subject,
    html,
  });
}
