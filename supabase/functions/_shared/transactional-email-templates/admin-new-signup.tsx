import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, button, buttonWrap, footer, noteBox } from './_styles.ts'

interface Props {
  advisorName?: string
  advisorEmail?: string
  signupTime?: string
  approveUrl?: string
}

const AdminNewSignupEmail = ({ advisorName = 'לא צוין', advisorEmail = '', signupTime = '', approveUrl = 'https://easydocs.tech' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>הרשמה חדשה: {advisorName} ({advisorEmail})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={heroBox}>
          <Heading style={heroTitle}>🔔 הרשמה חדשה למערכת</Heading>
          <Text style={heroSub}>EasyDocs · ממתין לאישור מנהל</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>נרשם/ה משתמש/ת חדש/ה</Heading>
          <Section style={noteBox}>
            <Text style={{ ...text, margin: '0 0 6px' }}><strong>שם:</strong> {advisorName}</Text>
            <Text style={{ ...text, margin: '0 0 6px' }}><strong>אימייל:</strong> {advisorEmail}</Text>
            <Text style={{ ...text, margin: 0 }}><strong>זמן:</strong> {signupTime}</Text>
          </Section>
          <Text style={text}>
            החשבון ממתין לאישור ידני. כדי להפעיל את היועצ/ת ולשלוח לה את מייל הברכה האוטומטי — היכנס לפאנל הניהול וסמן <strong>is_paid = true</strong>.
          </Text>
          <Section style={buttonWrap}>
            <Button href={approveUrl} style={button}>פתיחת המערכת</Button>
          </Section>
        </Section>
        <Section style={footer}>
          הודעה אוטומטית ממערכת EasyDocs · easydocs.tech
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewSignupEmail,
  subject: (data: Props) => `🔔 הרשמה חדשה: ${data?.advisorName || data?.advisorEmail || 'משתמש חדש'}`,
  displayName: 'התראת הרשמה חדשה (אדמין)',
  previewData: { advisorName: 'דנה לוי', advisorEmail: 'dana@example.com', signupTime: '03/05/2026 14:32', approveUrl: 'https://easydocs.tech' },
} satisfies TemplateEntry