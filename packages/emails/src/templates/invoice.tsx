import { Text, Button, Section } from "@react-email/components";
import { Layout } from "../components/Layout";

export interface InvoiceEmailProps {
  name: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  planName: string;
  billingPeriod: string;
  paymentDate: string;
  invoiceUrl: string;
  portalUrl: string;
}

export function InvoiceEmail({
  name,
  invoiceNumber,
  amount,
  currency,
  planName,
  billingPeriod,
  paymentDate,
  invoiceUrl,
  portalUrl,
}: InvoiceEmailProps) {
  return (
    <Layout previewText={`Invoice ${invoiceNumber} for ${planName}`}>
      <Section>
        <Text style={heading}>Payment Receipt</Text>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          Thank you for your payment! Here's your receipt for your recent purchase.
        </Text>

        {/* Invoice Summary Card */}
        <Section style={invoiceCard}>
          <table style={table}>
            <tbody>
              <tr>
                <td style={tableLabel}>Invoice Number:</td>
                <td style={tableValue}>#{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={tableLabel}>Plan:</td>
                <td style={tableValue}>{planName}</td>
              </tr>
              <tr>
                <td style={tableLabel}>Billing Period:</td>
                <td style={tableValue}>{billingPeriod}</td>
              </tr>
              <tr>
                <td style={tableLabel}>Payment Date:</td>
                <td style={tableValue}>{paymentDate}</td>
              </tr>
              <tr style={totalRow}>
                <td style={totalLabel}>Amount Paid:</td>
                <td style={totalValue}>
                  {currency} {amount}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section style={buttonGroup}>
          <Button style={button} href={invoiceUrl}>
            View Invoice
          </Button>
          <Button style={secondaryButton} href={portalUrl}>
            Manage Billing
          </Button>
        </Section>

        <Text style={paragraph}>
          Your payment has been processed successfully. You'll continue to have full access to all{" "}
          <strong>{planName}</strong> features.
        </Text>

        <Text style={infoNote}>
          💡 You can view all your invoices and manage your subscription in the billing portal at
          any time.
        </Text>

        <Text style={paragraph}>
          If you have any questions about this invoice or your subscription, please don't hesitate
          to reach out to our support team.
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

const invoiceCard = {
  backgroundColor: "#f6f9fc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e6ebf1",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const tableLabel = {
  fontSize: "14px",
  color: "#8898aa",
  padding: "12px 0",
  width: "45%",
};

const tableValue = {
  fontSize: "14px",
  color: "#525f7f",
  fontWeight: "600",
  padding: "12px 0",
  textAlign: "right" as const,
};

const totalRow = {
  borderTop: "2px solid #e6ebf1",
};

const totalLabel = {
  fontSize: "16px",
  color: "#1a1a1a",
  fontWeight: "bold",
  padding: "16px 0 12px 0",
};

const totalValue = {
  fontSize: "20px",
  color: "#556cd6",
  fontWeight: "bold",
  padding: "16px 0 12px 0",
  textAlign: "right" as const,
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
  border: "1px solid #556cd6",
};

const infoNote = {
  fontSize: "14px",
  color: "#525f7f",
  lineHeight: "20px",
  marginTop: "24px",
  padding: "16px",
  backgroundColor: "#e0e7ff",
  borderRadius: "6px",
  borderLeft: "4px solid #556cd6",
};
