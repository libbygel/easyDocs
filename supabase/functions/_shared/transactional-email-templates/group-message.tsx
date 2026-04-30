import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer } from './_styles.ts'

interface Props { name?: string; message?: string; advisorName?: string; portalLink?: string; subjectLine?: string }

const GroupMessageEmail = ({ name = 'לקוח/ה יקר/ה', message = '', advisorName, portalLink }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>{message.slice(0, 80)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>שלום {name},</Heading>
          {advisorName && <Text style={{ ...text, color: '#555', margin: '0 0 12px' }}>מאת: <strong>{advisorName}</strong></Text>}
          <Text style={{ ...text, whiteSpace: 'pre-wrap' }}>{message}</Text>
          {portalLink && (
            <Section style={buttonWrap}>
              <Button href={portalLink} style={button}>פתח פורטל אישי</Button>
            </Section>
          )}
        </Section>
        <Section style={footer}>הודעה זו נשלחה מ-EasyDocs.</Section>
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