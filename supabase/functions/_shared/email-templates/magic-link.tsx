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
          {/* Top accent bar */}
          <Section style={accentBar} />

          <Section style={headerSection}>
            <Img
              src={`${siteUrl}/favicon.ico`}
              alt="Heart Club"
              width="56"
              height="56"
              style={logo}
            />
          </Section>

          <Text style={heading}>Sua entrada exclusiva 🔑</Text>

          <Text style={paragraph}>
            Olá! Sua passagem para a <strong style={{ color: '#111' }}>elite do futebol mundial</strong> está a um clique de distância.
          </Text>

          <Text style={paragraph}>
            O Heart Club é onde torcedores de verdade deixam sua marca. Clique abaixo para acessar sua conta instantaneamente:
          </Text>

          <Section style={btnSection}>
            <Button style={button} href={confirmationUrl}>
              Acessar minha conta →
            </Button>
          </Section>

          <Section style={securityBox}>
            <Text style={securityText}>
              🔒 Este link é pessoal, válido por 1 hora e só pode ser usado uma vez.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            © Heart Club — O maior censo de torcidas do planeta
          </Text>
          <Text style={footerSub}>
            Se você não solicitou este acesso, ignore este email com segurança.
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
  padding: '0',
  maxWidth: '480px',
};

const accentBar = {
  height: '4px',
  background: 'linear-gradient(90deg, hsl(24, 100%, 50%), hsl(30, 100%, 60%))',
  borderRadius: '4px 4px 0 0',
};

const headerSection = {
  textAlign: 'center' as const,
  padding: '32px 24px 16px',
};

const logo = {
  margin: '0 auto',
  borderRadius: '14px',
};

const heading = {
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  fontSize: '26px',
  fontWeight: '700',
  color: '#111111',
  textAlign: 'center' as const,
  margin: '0 24px 20px',
  lineHeight: '1.3',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#444444',
  margin: '0 24px 14px',
};

const btnSection = {
  textAlign: 'center' as const,
  margin: '28px 24px',
};

const button = {
  backgroundColor: 'hsl(24, 100%, 50%)',
  color: '#ffffff',
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  fontWeight: '700',
  fontSize: '16px',
  borderRadius: '12px',
  padding: '16px 40px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 14px rgba(255, 102, 0, 0.35)',
};

const securityBox = {
  backgroundColor: '#f8f8f8',
  borderRadius: '10px',
  margin: '0 24px',
  padding: '14px 18px',
};

const securityText = {
  fontSize: '13px',
  color: '#666666',
  margin: '0',
  textAlign: 'center' as const,
  lineHeight: '1.5',
};

const hr = {
  borderColor: '#eeeeee',
  margin: '28px 24px',
};

const footer = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '0 24px 4px',
  fontWeight: '600' as const,
};

const footerSub = {
  fontSize: '11px',
  color: '#bbbbbb',
  textAlign: 'center' as const,
  margin: '0 24px 24px',
};
