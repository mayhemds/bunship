import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface VerifyEmailProps {
  name: string;
  verificationUrl: string;
  resendUrl?: string;
}

export function VerifyEmail({ name, verificationUrl, resendUrl }: VerifyEmailProps) {
  return (
    <Layout previewText="Please verify your email address">
      <Section>
        <Text style={heading}>Verify Your Email Address</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          Thank you for signing up for BunShip! To complete your registration and activate your
          account, please verify your email address by clicking the button below.
        </Text>
        <Button style={button} href={verificationUrl}>
          Verify Email Address
        </Button>
        <Text style={notice}>⏰ This verification link will expire in 24 hours.</Text>
        <Text style={paragraph}>
          If the button doesn't work, you can copy and paste this link into your browser:
        </Text>
        <Text style={urlText}>{verificationUrl}</Text>
        {resendUrl && (
          <>
            <Text style={paragraph}>
              Didn't receive this email or need a new verification link?
            </Text>
            <Button style={secondaryButton} href={resendUrl}>
              Resend Verification Email
            </Button>
          </>
        )}
        <Text style={securityNote}>
          If you didn't create an account with BunShip, you can safely ignore this email.
        </Text>
      </Section>
    </Layout>
  );
}

// Styles
const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1a1a1a",
  marginTop: "0",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  color: "#525f7f",
  lineHeight: "24px",
  margin: "16px 0",
};

const button = {
  backgroundColor: "#556cd6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};

const secondaryButton = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  color: "#556cd6",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "10px 20px",
  margin: "16px 0",
  border: "1px solid #556cd6",
};

const notice = {
  fontSize: "14px",
  color: "#f59e0b",
  backgroundColor: "#fef3c7",
  padding: "12px 16px",
  borderRadius: "6px",
  margin: "16px 0",
  textAlign: "center" as const,
};

const urlText = {
  fontSize: "12px",
  color: "#8898aa",
  wordBreak: "break-all" as const,
  backgroundColor: "#f6f9fc",
  padding: "12px",
  borderRadius: "4px",
  margin: "8px 0",
};

const securityNote = {
  fontSize: "14px",
  color: "#8898aa",
  lineHeight: "20px",
  marginTop: "32px",
  padding: "16px",
  backgroundColor: "#f6f9fc",
  borderRadius: "6px",
  borderLeft: "4px solid #556cd6",
};
