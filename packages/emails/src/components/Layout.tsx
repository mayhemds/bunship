import { Html, Head, Body, Container, Section, Text, Link, Hr, Img } from "@react-email/components";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  previewText?: string;
}

export function Layout({ children, previewText }: LayoutProps) {
  return (
    <Html>
      <Head />
      {previewText && <Text style={preview}>{previewText}</Text>}
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🚀 BunShip</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} BunShip. All rights reserved.
            </Text>
            <Text style={footerText}>
              Built with Bun + Elysia - The fastest SaaS API boilerplate
            </Text>
            <Text style={footerLinks}>
              <Link href="https://bunship.com" style={link}>
                Website
              </Link>
              {" · "}
              <Link href="https://bunship.com/docs" style={link}>
                Documentation
              </Link>
              {" · "}
              <Link href="https://bunship.com/support" style={link}>
                Support
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "20px 0",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  maxWidth: "600px",
};

const header = {
  padding: "32px 40px",
  textAlign: "center" as const,
};

const logo = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0",
};

const content = {
  padding: "0 40px 40px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  padding: "0 40px 40px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "16px",
  margin: "4px 0",
};

const footerLinks = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "16px",
  margin: "12px 0 0",
};

const link = {
  color: "#556cd6",
  textDecoration: "none",
};

const preview = {
  display: "none",
  overflow: "hidden",
  lineHeight: "1px",
  opacity: 0,
  maxHeight: 0,
  maxWidth: 0,
};
