/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1';
import { Html, Head, Body, Container, Section, Text, Img, Hr } from 'npm:@react-email/components@0.0.22';

interface CampaignEmailProps {
  siteName?: string;
  siteUrl?: string;
  bodyLines?: string[];
  trackingPixelUrl?: string;
}

export default function CampaignEmail({
  siteUrl = 'https://www.heartclubapp.com',
  bodyLines = [],
  trackingPixelUrl,
}: CampaignEmailProps) {
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
          {bodyLines.map((line, i) => (
            <Text style={paragraph} key={i}>
              {line}
            </Text>
          ))}
          <Hr style={hr} />
          <Text style={footer}>
            © Heart Club — O maior censo de torcidas do mundo
          </Text>
          {trackingPixelUrl && (
            <Img src={trackingPixelUrl} width="1" height="1" alt="" style={{ display: 'none' }} />
          )}
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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#555555',
  margin: '0 0 12px',
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
