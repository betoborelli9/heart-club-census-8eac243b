/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface ReauthenticationEmailProps {
  siteName?: string;
  siteUrl?: string;
  token?: string;
  recipient?: string;
}

export default function ReauthenticationEmail({
  siteName = 'Heart Club',
  siteUrl = 'https://www.heartclubapp.com',
  token = '',
  recipient = '',
}: ReauthenticationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src={`${siteUrl}/favicon.ico`}
              alt="Heart Club"
              width="64"
              height="64"
              style={logo}
            />
          </Section>
          <Text style={heading}>Código de verificação 🔐</Text>
          <Text style={paragraph}>
            Use o código abaixo para confirmar sua identidade no Heart Club:
          </Text>
          <Section style={codeSection}>
            <Text style={codeText}>{token}</Text>
          </Section>
          <Text style={smallText}>
            Este código expira em 10 minutos. Se você não solicitou, ignore este email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            © Heart Club — O maior censo de torcidas do mundo
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '480px',
};

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const logo = {
  margin: '0 auto',
  borderRadius: '16px',
};

const heading = {
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  fontSize: '24px',
  fontWeight: '700',
  color: '#111111',
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#555555',
  margin: '0 0 12px',
};

const codeSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const codeText = {
  fontFamily: "'Space Grotesk', monospace",
  fontSize: '36px',
  fontWeight: '700',
  letterSpacing: '8px',
  color: 'hsl(24, 100%, 50%)',
  textAlign: 'center' as const,
  margin: '0',
};

const smallText = {
  fontSize: '13px',
  color: '#999999',
  margin: '16px 0',
};

const hr = {
  borderColor: '#eeeeee',
  margin: '24px 0',
};

const footer = {
  fontSize: '12px',
  color: '#aaaaaa',
  textAlign: 'center' as const,
};
