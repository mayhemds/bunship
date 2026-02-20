import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface TeamInviteEmailProps {
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}

export function TeamInviteEmail({
  inviteeName,
  inviterName,
  organizationName,
  role,
  inviteUrl,
}: TeamInviteEmailProps) {
  return (
    <Layout previewText={`${inviterName} invited you to join ${organizationName}`}>
      <Section>
        <Text style={heading}>You've Been Invited! 🎉</Text>
        <Text style={paragraph}>Hi {inviteeName || "there"},</Text>
        <Text style={paragraph}>
          <strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong>{" "}
          on BunShip.
        </Text>
        <Section style={inviteCard}>
          <Text style={inviteCardTitle}>Invitation Details</Text>
          <table style={table}>
            <tbody>
              <tr>
                <td style={tableLabel}>Organization:</td>
                <td style={tableValue}>{organizationName}</td>
              </tr>
              <tr>
                <td style={tableLabel}>Invited by:</td>
                <td style={tableValue}>{inviterName}</td>
              </tr>
              <tr>
                <td style={tableLabel}>Role:</td>
                <td style={tableValue}>
                  <span style={roleBadge}>{role}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
        <Text style={paragraph}>
          Click the button below to accept the invitation and get started:
        </Text>
        <Button style={button} href={inviteUrl}>
          Accept Invitation
        </Button>
        <Text style={notice}>⏰ This invitation will expire in 7 days.</Text>
        <Text style={paragraph}>
          If the button doesn't work, you can copy and paste this link into your browser:
        </Text>
        <Text style={urlText}>{inviteUrl}</Text>
        <Text style={securityNote}>
          If you weren't expecting this invitation or don't want to join this organization, you can
          safely ignore this email.
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

const inviteCard = {
  backgroundColor: "#f6f9fc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e6ebf1",
};

const inviteCardTitle = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#1a1a1a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "16px",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const tableLabel = {
  fontSize: "14px",
  color: "#8898aa",
  padding: "8px 0",
  width: "40%",
  verticalAlign: "top",
};

const tableValue = {
  fontSize: "14px",
  color: "#525f7f",
  fontWeight: "600",
  padding: "8px 0",
  verticalAlign: "top",
};

const roleBadge = {
  backgroundColor: "#556cd6",
  color: "#fff",
  padding: "4px 12px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "capitalize" as const,
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
  color: "#8898aa",
  lineHeight: "20px",
  marginTop: "32px",
  padding: "16px",
  backgroundColor: "#f6f9fc",
  borderRadius: "6px",
  borderLeft: "4px solid #556cd6",
};
