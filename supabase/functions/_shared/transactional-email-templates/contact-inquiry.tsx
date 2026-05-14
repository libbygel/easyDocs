import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, footer, noteBox } from './_styles.ts'

interface Props {
  name?: string
  phone?: string
  email?: string
  officeSize?: string
  notes?: string
  submittedAt?: string
}

const ContactInquiryEmail = ({
  name = '',
  phone = '',
  email = '',
  officeSize = '',
  notes = '',
  submittedAt = '',
}: Props) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>פנייה חדשה לקבלת הצעה מ-{name || email}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={heroBox}>
          <Heading style={heroTitle}>📩 פנייה חדשה לקבלת הצעה</Heading>
          <Text style={heroSub}>EasyDocs · דף קבלת הצעה</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>פרטי הפנייה</Heading>
          <Section style={noteBox}>
            <Text style={{ ...text, margin: '0 0 6px' }}><strong>שם:</strong> {name}</Text>
            <Text style={{ ...text, margin: '0 0 6px' }}><strong>טלפון:</strong> {phone}</Text>
            <Text style={{ ...text, margin: '0 0 6px' }}><strong>מייל:</strong> {email}</Text>
            {officeSize ? <Text style={{ ...text, margin: '0 0 6px' }}><strong>גודל משרד / כמות לקוחות:</strong> {officeSize}</Text> : null}
            <Text style={{ ...text, margin: 0 }}><strong>זמן שליחה:</strong> {submittedAt}</Text>
          </Section>
          {notes ? (
            <Section style={{ ...noteBox, background: '#f8fafc', borderRightColor: '#94a3b8' }}>
              <Text style={{ ...text, margin: 0, whiteSpace: 'pre-wrap' as const }}><strong>הערות:</strong><br />{notes}</Text>
            </Section>
          ) : null}
        </Section>
        <Section style={footer}>
          הודעה אוטומטית ממערכת EasyDocs · easydocs.tech
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactInquiryEmail,
  subject: (data: Props) => `🔔 פנייה חדשה מ-EasyDocs: ${data?.name || data?.email || 'לקוח חדש'}`,
  displayName: 'פנייה מדף קבלת הצעה',
  previewData: {
    name: 'ישראל ישראלי',
    phone: '050-1234567',
    email: 'israel@example.com',
    officeSize: 'כ-150 לקוחות פעילים',
    notes: 'אשמח לשמוע על התאמה למשרד שלי.',
    submittedAt: '14/05/2026 12:30',
  },
} satisfies TemplateEntry