import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer, docBox, docsWrap } from './_styles.ts'

interface RejectedDoc { doc_name: string; rejection_reason?: string; case_title?: string }
interface Props { clientName?: string; advisorName?: string; portalUrl?: string; rejectedDocs?: RejectedDoc[] }

const DailyRejectionEmail = ({ clientName = 'לקוח/ה יקר/ה', advisorName, portalUrl = '#', rejectedDocs = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head><meta charSet="utf-8" /><meta httpEquiv="Content-Type" content="text/html; charset=utf-8" /></Head>
    <Preview>היועץ שלח לך הודעת דחייה על מסמכים</Preview>
    <Body style={{ ...main, direction: 'rtl', textAlign: 'right' }} dir="rtl">
      <Container style={{ ...container, direction: 'rtl', textAlign: 'right' }} dir="rtl">
        <Section style={{ ...card, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...h1, textAlign: 'right' }} dir="rtl">שלום {clientName},</Heading>
          <Text style={{ ...text, direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">
            {advisorName ? `${advisorName} שלח/ה לך הודעת דחייה` : 'התקבלה הודעת דחייה'} על המסמכים הבאים:
          </Text>
          <Section style={{ ...docsWrap, direction: 'rtl', textAlign: 'right' }} dir="rtl">
            {rejectedDocs.map((d, i) => (
              <Section key={i} style={{ ...docBox, direction: 'rtl', textAlign: 'right' }} dir="rtl">
                <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">{d.doc_name}</Text>
                {d.case_title && <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">תיק: {d.case_title}</Text>}
                {d.rejection_reason && <Text style={{ margin: '6px 0 0', fontSize: '13px', color: '#dc2626', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">סיבת דחייה: {d.rejection_reason}</Text>}
              </Section>
            ))}
          </Section>
          <Section style={buttonWrap}>
            <Button href={portalUrl} style={button}>תיקון המסמכים</Button>
          </Section>
        </Section>
        <Section style={{ ...footer, direction: 'rtl' }} dir="rtl">EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyRejectionEmail,
  subject: 'היועץ שלח לך הודעת דחייה על מסמכים',
  displayName: 'הודעת דחייה ללקוח',
  previewData: { clientName: 'יוסי כהן', advisorName: 'דנה לוי', portalUrl: 'https://easydocs.tech/portal/abc', rejectedDocs: [{ doc_name: 'תלוש שכר', rejection_reason: 'לא קריא', case_title: 'משכנתא' }] },
} satisfies TemplateEntry