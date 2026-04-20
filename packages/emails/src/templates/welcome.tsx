import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Layout previewText={`Welcome to BunShip, ${name}!`}>
      <Section>
        <Text style={heading}>Welcome to BunShip! 🎉</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          Thank you for joining BunShip! We're excited to have you on board.
        </Text>
        <Text style={paragraph}>
          BunShip is a modern SaaS API boilerplate built with Bun and Elysia, designed to help you
          ship your next project faster. With built-in authentication, multi-tenancy, billing, and
          more, you can focus on building your unique features instead of reinventing the wheel.
        </Text>
        <Text style={paragraph}>Here's what you can do next:</Text>
        <ul style={list}>
          <li style={listItem}>Explore the dashboard and set up your profile</li>
          <li style={listItem}>Create your first organization</li>
          <li style={listItem}>Generate API keys for your projects</li>
          <li style={listItem}>Check out the documentation to learn about all features</li>
        </ul>
        <Button style={button} href={dashboardUrl}>
          Get Started
        </Button>
        <Text style={paragraph}>
          If you have any questions or need help, our support team is here for you. Just reply to
          this email or visit our support center.
        </Text>
        <Text style={signature}>
          Best regards,
          <br />
          The BunShip Team
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

const list = {
  paddingLeft: "20px",
  margin: "16px 0",
};

const listItem = {
  fontSize: "16px",
  color: "#525f7f",
  lineHeight: "24px",
  marginBottom: "8px",
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

const signature = {
  fontSize: "16px",
  color: "#525f7f",
  lineHeight: "24px",
  marginTop: "32px",
};
