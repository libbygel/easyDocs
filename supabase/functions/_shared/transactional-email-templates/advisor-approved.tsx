import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, button, buttonWrap, footer } from './_styles.ts'

interface Props {
  advisorName?: string
  loginUrl?: string
}

const AdvisorApprovedEmail = ({ advisorName, loginUrl = 'https://easydocs.tech/auth' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>החשבון שלך ב-EasyDocs אושר</Preview>
    <Body style={{ ...main, direction: 'rtl', textAlign: 'right' }} dir="rtl">
      <Container style={{ ...container, direction: 'rtl', textAlign: 'right' }} dir="rtl">
        <Section style={{ ...heroBox, direction: 'rtl', textAlign: 'right' }}>
          <Heading style={{ ...heroTitle, textAlign: 'right' }}>ברוך הבא ל-EasyDocs</Heading>
          <Text style={{ ...heroSub, textAlign: 'right' }}>החשבון שלך אושר ומוכן לשימוש</Text>
        </Section>
        <Section style={{ ...card, direction: 'rtl', textAlign: 'right' }}>
          <Heading style={{ ...h1, textAlign: 'right' }}>{advisorName ? `שלום ${advisorName},` : 'שלום,'}</Heading>
          <Text style={{ ...text, textAlign: 'right' }}>
            שמחים לבשר לך שהחשבון שלך במערכת <strong>EasyDocs</strong> אושר בהצלחה.
          </Text>
          <Text style={{ ...text, textAlign: 'right' }}>
            אפשר להיכנס למערכת ולהתחיל לעבוד עם תיקי לקוחות, מסמכים, חתימות דיגיטליות ותזכורות אוטומטיות.
          </Text>
          <Section style={buttonWrap}>
            <Button href={loginUrl} style={button}>כניסה למערכת</Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#64748b', textAlign: 'right' }}>
            יש שאלות? אנחנו כאן לעזור - פשוט השב למייל הזה.
          </Text>
        </Section>
        <Section style={footer}>
          הודעה זו נשלחה ממערכת EasyDocs - easydocs.tech
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdvisorApprovedEmail,
  subject: 'החשבון שלך ב-EasyDocs אושר',
  displayName: 'אישור יועצ/ת חדש/ה',
  previewData: { advisorName: 'דנה לוי', loginUrl: 'https://easydocs.tech/auth' },
} satisfies TemplateEntry