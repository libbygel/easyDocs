import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer } from './_styles.ts'

interface Props { name?: string; message?: string; advisorName?: string; portalLink?: string; subjectLine?: string }

const GroupMessageEmail = ({ name = 'לקוח/ה יקר/ה', message = '', advisorName, portalLink }: Props) => (
  <Html lang="he" dir="rtl">
    <Head><meta charSet="utf-8" /><meta httpEquiv="Content-Type" content="text/html; charset=utf-8" /></Head>
    <Preview>{message.slice(0, 80)}</Preview>
    <Body style={{ ...main, direction: 'rtl', textAlign: 'right' }} dir="rtl">
      <Container style={{ ...container, direction: 'rtl', textAlign: 'right' }} dir="rtl">
        <Section style={{ ...card, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...h1, textAlign: 'right' }} dir="rtl">שלום {name},</Heading>
          {advisorName && <Text style={{ ...text, color: '#555', margin: '0 0 12px', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">מאת: <strong>{advisorName}</strong></Text>}
          <Text style={{ ...text, whiteSpace: 'pre-wrap', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">{message}</Text>
          {portalLink && (
            <Section style={buttonWrap}>
              <Button href={portalLink} style={button}>פתח פורטל אישי</Button>
            </Section>
          )}
        </Section>
        <Section style={{ ...footer, direction: 'rtl' }} dir="rtl">הודעה זו נשלחה מ-EasyDocs.</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: GroupMessageEmail,
  subject: (data: Props) => data?.subjectLine || 'הודעה מ-EasyDocs',
  displayName: 'הודעה מותאמת ללקוח',
  previewData: { name: 'יוסי', message: 'הודעה לדוגמה', advisorName: 'דנה', subjectLine: 'הודעה חשובה' },
} satisfies TemplateEntry