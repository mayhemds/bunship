import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface SubscriptionCanceledEmailProps {
  name: string;
  planName: string;
  accessEndDate: string;
  resubscribeUrl: string;
  feedbackUrl?: string;
}

export function SubscriptionCanceledEmail({
  name,
  planName,
  accessEndDate,
  resubscribeUrl,
  feedbackUrl,
}: SubscriptionCanceledEmailProps) {
  return (
    <Layout previewText="Your subscription has been canceled">
      <Section>
        <Text style={heading}>Subscription Canceled</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          We're sorry to see you go! Your <strong>{planName}</strong> subscription has been
          successfully canceled.
        </Text>

        {/* Access Info Card */}
        <Section style={infoCard}>
          <Text style={infoCardTitle}>What happens next?</Text>
          <Text style={infoCardText}>
            You'll continue to have full access to all {planName} features until:
          </Text>
          <Text style={dateHighlight}>{accessEndDate}</Text>
          <Text style={infoCardText}>
            After this date, your account will be downgraded to the free plan, and you'll lose
            access to premium features.
          </Text>
        </Section>

        <Text style={paragraph}>
          Changed your mind? You can reactivate your subscription at any time before {accessEndDate}
          .
        </Text>

        <Section style={buttonGroup}>
          <Button style={button} href={resubscribeUrl}>
            Reactivate Subscription
          </Button>
        </Section>

        {/* Feature Reminder */}
        <Section style={reminderCard}>
          <Text style={reminderTitle}>You'll be missing out on:</Text>
          <ul style={list}>
            <li style={listItem}>🚀 Advanced API endpoints and higher rate limits</li>
            <li style={listItem}>👥 Team collaboration and multi-user access</li>
            <li style={listItem}>📊 Advanced analytics and reporting dashboards</li>
            <li style={listItem}>🔒 Priority support and SLA guarantees</li>
            <li style={listItem}>🎯 Custom integrations and webhooks</li>
          </ul>
        </Section>

        {feedbackUrl && (
          <>
            <Text style={paragraph}>
              We'd love to hear your feedback on why you're leaving. It helps us improve BunShip for
              everyone.
            </Text>
            <Button style={secondaryButton} href={feedbackUrl}>
              Share Feedback
            </Button>
          </>
        )}

        <Text style={paragraph}>
          Thank you for being a part of BunShip. We hope to see you again soon!
        </Text>

        <Text style={supportNote}>
          If you canceled by mistake or have questions, please contact our support team - we're here
          to help.
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

const infoCard = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #fbbf24",
};

const infoCardTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0 0 12px 0",
};

const infoCardText = {
  fontSize: "14px",
  color: "#525f7f",
  lineHeight: "20px",
  margin: "8px 0",
};

const dateHighlight = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#f59e0b",
  margin: "16px 0",
  textAlign: "center" as const,
};

const buttonGroup = {
  margin: "24px 0",
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
  margin: "0 0 12px 0",
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

const reminderCard = {
  backgroundColor: "#f6f9fc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e6ebf1",
};

const reminderTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0 0 16px 0",
};

const list = {
  paddingLeft: "0",
  margin: "0",
  listStyle: "none",
};

const listItem = {
  fontSize: "14px",
  color: "#525f7f",
  lineHeight: "24px",
  marginBottom: "12px",
  paddingLeft: "0",
};

const supportNote = {
  fontSize: "14px",
  color: "#8898aa",
  lineHeight: "20px",
  marginTop: "32px",
  padding: "16px",
  backgroundColor: "#f6f9fc",
  borderRadius: "6px",
  borderLeft: "4px solid #556cd6",
};
