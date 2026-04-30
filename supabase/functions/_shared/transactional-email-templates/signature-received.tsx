import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer } from './_styles.ts'

interface Props { advisorName?: string; clientName?: string; docName?: string; caseTitle?: string; portalUrl?: string }

const SignatureReceivedEmail = ({ advisorName = 'יועץ יקר', clientName = '', docName = '', caseTitle = '', portalUrl = '#' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>חתימה חדשה התקבלה מ-{clientName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={{ ...h1, color: '#22c55e' }}>✍️ חתימה חדשה התקבלה!</Heading>
          <Text style={text}>שלום {advisorName},</Text>
          <Text style={text}>הלקוח <strong>{clientName}</strong> חתם על המסמך:</Text>
          <Section style={{ background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
            <Text style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{docName}</Text>
            <Text style={{ margin: '8px 0 0', color: '#666' }}>תיק: {caseTitle}</Text>
          </Section>
          <Section style={buttonWrap}>
            <Button href={portalUrl} style={button}>צפה בתיק</Button>
          </Section>
        </Section>
        <Section style={footer}>EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignatureReceivedEmail,
  subject: (data: Props) => `✍️ חתימה חדשה התקבלה מ-${data?.clientName ?? ''}`,
  displayName: 'התראה על חתימה',
  previewData: { advisorName: 'דנה לוי', clientName: 'יוסי כהן', docName: 'הסכם משכנתא', caseTitle: 'משכנתא 2025', portalUrl: 'https://easydocs.tech/cases/1' },
} satisfies TemplateEntry