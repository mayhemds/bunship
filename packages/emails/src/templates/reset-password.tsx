import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Layout previewText="Reset your BunShip password">
      <Section>
        <Text style={heading}>Reset Your Password</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          We received a request to reset the password for your BunShip account. Click the button
          below to set a new password.
        </Text>
        <Button style={button} href={resetUrl}>
          Reset Password
        </Button>
        <Text style={notice}>⏰ This link will expire in 1 hour.</Text>
        <Text style={paragraph}>
          If the button doesn't work, you can copy and paste this link into your browser:
        </Text>
        <Text style={urlText}>{resetUrl}</Text>
        <Text style={securityNote}>
          🔒 <strong>Security Notice:</strong> If you didn't request this password reset, please
          ignore this email and your password will remain unchanged. Someone may have entered your
          email address by mistake.
        </Text>
        <Text style={securityNote}>For your security, we recommend:</Text>
        <ul style={list}>
          <li style={listItem}>Using a strong, unique password</li>
          <li style={listItem}>Enabling two-factor authentication</li>
          <li style={listItem}>Never sharing your password with anyone</li>
        </ul>
        <Text style={paragraph}>
          If you're having trouble or didn't request this reset, please contact our support team
          immediately.
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
  color: "#525f7f",
  lineHeight: "20px",
  marginTop: "24px",
  padding: "16px",
  backgroundColor: "#fef3c7",
  borderRadius: "6px",
  borderLeft: "4px solid #f59e0b",
};

const list = {
  paddingLeft: "20px",
  margin: "8px 0",
};

const listItem = {
  fontSize: "14px",
  color: "#525f7f",
  lineHeight: "20px",
  marginBottom: "4px",
};
