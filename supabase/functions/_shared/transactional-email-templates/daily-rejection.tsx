import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer, docBox, docsWrap } from './_styles.ts'

interface RejectedDoc { doc_name: string; rejection_reason?: string; case_title?: string }
interface Props { clientName?: string; advisorName?: string; portalUrl?: string; rejectedDocs?: RejectedDoc[] }

const DailyRejectionEmail = ({ clientName = 'לקוח/ה יקר/ה', advisorName, portalUrl = '#', rejectedDocs = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>מסמכים שנדחו דורשים תיקון</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>שלום {clientName},</Heading>
          <Text style={text}>
            ישנם מסמכים{advisorName ? ` ש-${advisorName} סימן/ה` : ''} כדורשים תיקון:
          </Text>
          <Section style={docsWrap}>
            {rejectedDocs.map((d, i) => (
              <Section key={i} style={docBox}>
                <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{d.doc_name}</Text>
                {d.case_title && <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>תיק: {d.case_title}</Text>}
                {d.rejection_reason && <Text style={{ margin: '6px 0 0', fontSize: '13px', color: '#dc2626' }}>סיבת דחייה: {d.rejection_reason}</Text>}
              </Section>
            ))}
          </Section>
          <Section style={buttonWrap}>
            <Button href={portalUrl} style={button}>תיקון המסמכים</Button>
          </Section>
        </Section>
        <Section style={footer}>EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyRejectionEmail,
  subject: 'מסמכים דורשים תיקון',
  displayName: 'תזכורת יומית למסמכים שנדחו',
  previewData: { clientName: 'יוסי כהן', advisorName: 'דנה לוי', portalUrl: 'https://easydocs.tech/portal/abc', rejectedDocs: [{ doc_name: 'תלוש שכר', rejection_reason: 'לא קריא', case_title: 'משכנתא' }] },
} satisfies TemplateEntry