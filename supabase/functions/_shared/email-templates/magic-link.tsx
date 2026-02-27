/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Button, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface MagicLinkEmailProps {
  siteName?: string;
  siteUrl?: string;
  confirmationUrl?: string;
  recipient?: string;
}

export default function MagicLinkEmail({
  siteName = 'Heart Club',
  siteUrl = 'https://www.heartclubapp.com',
  confirmationUrl = '',
  recipient = '',
}: MagicLinkEmailProps) {
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
          <Text style={heading}>Seu acesso ao Heart Club 🔑</Text>
          <Text style={paragraph}>
            Fala, torcedor! Alguém solicitou um link de acesso para sua conta no Heart Club.
          </Text>
          <Text style={paragraph}>
            Clique no botão abaixo para entrar direto na sua conta:
          </Text>
          <Section style={btnSection}>
            <Button style={button} href={confirmationUrl}>
              Entrar no Heart Club
            </Button>
          </Section>
          <Text style={smallText}>
            Este link expira em 1 hora. Se você não solicitou este acesso, ignore este email.
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

const btnSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const button = {
  backgroundColor: 'hsl(24, 100%, 50%)',
  color: '#ffffff',
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  fontWeight: '700',
  fontSize: '15px',
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
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
