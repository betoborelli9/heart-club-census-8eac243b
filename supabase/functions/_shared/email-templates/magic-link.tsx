/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface MagicLinkEmailProps {
  siteName?: string;
  siteUrl?: string;
  confirmationUrl?: string;
  token?: string;
  recipient?: string;
}

// Banner placeholder — substitua pelo banner oficial do Heart Club
const BANNER_URL = 'https://www.heartclubapp.com/email-banner.png';

export default function MagicLinkEmail({
  siteName = 'Heart Club',
  siteUrl = 'https://www.heartclubapp.com',
  confirmationUrl = siteUrl,
  token = '000000',
  recipient = '',
}: MagicLinkEmailProps) {
  const code = (token || '').toString().slice(0, 6);

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Banner superior (placeholder) */}
          <Section style={bannerSection}>
            <Img
              src={BANNER_URL}
              alt={siteName}
              width="480"
              height="160"
              style={bannerImg}
            />
          </Section>

          <Section style={accentBar} />

          <Text style={heading}>Bem-vindo ao Censo Global 🌎🧡</Text>

          <Text style={paragraph}>
            Você está prestes a entrar no <strong style={{ color: '#111' }}>maior censo de torcidas do planeta</strong>.
            Sua voz é parte de uma história que está sendo escrita por milhões de torcedores.
          </Text>

          <Section style={buttonSection}>
            <a href={confirmationUrl} style={buttonStyle}>
              Entrar no Heart Club
            </a>
          </Section>

          <Text style={paragraphCenter}>
            Se o botão não abrir, use este código:
          </Text>

          {/* CÓDIGO 6 DÍGITOS EM DESTAQUE */}
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Section style={securityBox}>
            <Text style={securityText}>
              🔒 Este código é pessoal, válido por 1 hora e só pode ser usado uma vez.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            © {siteName} — O maior censo de torcidas do planeta
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

const bannerSection = {
  textAlign: 'center' as const,
  margin: '0',
  padding: '0',
};

const bannerImg = {
  width: '100%',
  maxWidth: '480px',
  height: 'auto',
  display: 'block',
  borderRadius: '12px 12px 0 0',
};

const accentBar = {
  height: '4px',
  background: 'linear-gradient(90deg, hsl(24, 100%, 50%), hsl(30, 100%, 60%))',
};

const heading = {
  fontFamily: "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  fontSize: '26px',
  fontWeight: '700',
  color: '#111111',
  textAlign: 'center' as const,
  margin: '28px 24px 18px',
  lineHeight: '1.3',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: '#444444',
  margin: '0 24px 14px',
};

const paragraphCenter = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#444444',
  margin: '8px 24px 12px',
  textAlign: 'center' as const,
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 24px 18px',
};

const buttonStyle = {
  backgroundColor: 'hsl(24, 100%, 50%)',
  color: '#ffffff',
  display: 'inline-block',
  padding: '15px 28px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '800' as const,
  fontStyle: 'italic' as const,
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
};

const codeBox = {
  margin: '8px 24px 24px',
  padding: '22px 16px',
  backgroundColor: '#FFF4EC',
  border: '2px dashed hsl(24, 100%, 50%)',
  borderRadius: '14px',
  textAlign: 'center' as const,
};

const codeText = {
  fontFamily: "'Space Grotesk', 'Courier New', monospace",
  fontSize: '40px',
  fontWeight: '900' as const,
  letterSpacing: '12px',
  color: 'hsl(24, 100%, 45%)',
  margin: '0',
  lineHeight: '1.1',
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
