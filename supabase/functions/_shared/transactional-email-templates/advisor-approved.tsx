import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, button, buttonWrap, footer, noteBox } from './_styles.ts'

interface Props {
  advisorName?: string
  loginUrl?: string
}

const AdvisorApprovedEmail = ({ advisorName = 'יועצ/ת יקר/ה', loginUrl = 'https://easydocs.tech/auth' }: Props) => (
  <Html lang="he" dir="rtl">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
    <Preview>החשבון שלך ב-EasyDocs אושר 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={heroBox}>
          <Heading style={heroTitle}>🎉 ברוכ/ה הבא/ה ל-EasyDocs</Heading>
          <Text style={heroSub}>החשבון שלך אושר ומוכן לשימוש</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>שלום {advisorName},</Heading>
          <Text style={text}>
            שמחים לבשר לך שהחשבון שלך במערכת <strong>EasyDocs</strong> אושר בהצלחה ✅
          </Text>
          <Text style={text}>
            מעכשיו תוכל/י להיכנס למערכת, לפתוח תיקים ללקוחות, לנהל מסמכים, חתימות דיגיטליות, תזכורות אוטומטיות ועוד כלים שיחסכו לך זמן יקר.
          </Text>
          <Section style={noteBox}>
            <Text style={{ ...text, margin: 0 }}>
              💡 <strong>טיפ למתחילים:</strong> מומלץ להתחיל בהגדרת תבניות מסמכים בהגדרות, כדי שכל תיק חדש ייפתח אוטומטית עם רשימת המסמכים הנדרשים.
            </Text>
          </Section>
          <Section style={buttonWrap}>
            <Button href={loginUrl} style={button}>כניסה למערכת</Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#64748b' }}>
            יש שאלות? אנחנו כאן לעזור — פשוט השב/י למייל הזה.
          </Text>
        </Section>
        <Section style={footer}>
          הודעה זו נשלחה ממערכת EasyDocs · easydocs.tech
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdvisorApprovedEmail,
  subject: 'החשבון שלך ב-EasyDocs אושר 🎉',
  displayName: 'אישור יועצ/ת חדש/ה',
  previewData: { advisorName: 'דנה לוי', loginUrl: 'https://easydocs.tech/auth' },
} satisfies TemplateEntry