import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, footer, noteBox } from './_styles.ts'

interface DocItem { doc_name: string }
interface Props {
  recipientName?: string
  caseTitle?: string
  clientName?: string
  documents?: DocItem[]
  portalUrl?: string
}

const ClientSubmissionNotificationEmail = ({ recipientName = 'יועץ', caseTitle = '', clientName = 'הלקוח', documents = [], portalUrl }: Props) => (
  <Html lang="he" dir="rtl">
    <Head><meta charSet="utf-8" /></Head>
    <Preview>{clientName} שלח מסמכים לתיק {caseTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>התקבלו מסמכים חדשים</Heading>
          <Text style={text}>שלום {recipientName},</Text>
          <Text style={text}>
            הלקוח <strong>{clientName}</strong> שלח מסמכים לתיק <strong>{caseTitle}</strong>.
          </Text>
          {documents.length > 0 && (
            <Section style={noteBox}>
              <Text style={{ ...text, margin: '0 0 8px', fontWeight: 600 }}>מסמכים שהועלו:</Text>
              {documents.map((d, i) => (
                <Text key={i} style={{ ...text, margin: '4px 0' }}>• {d.doc_name}</Text>
              ))}
            </Section>
          )}
          <Text style={text}>היכנס למערכת כדי לצפות במסמכים ולאשר אותם.</Text>
          {portalUrl && (
            <Button href={portalUrl} style={{ background: '#1E3A8A', color: '#fff', padding: '12px 20px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', marginTop: 12 }}>
              צפייה בתיק
            </Button>
          )}
        </Section>
        <Section style={footer}>נשלח מ-EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientSubmissionNotificationEmail,
  subject: (data: Props) => `${data?.clientName || 'לקוח'} שלח מסמכים - ${data?.caseTitle || ''}`,
  displayName: 'התראת שליחת מסמכים מלקוח',
  previewData: { recipientName: 'דנה', clientName: 'יוסי כהן', caseTitle: 'משכנתא 2025', documents: [{ doc_name: 'תלוש שכר' }, { doc_name: 'תעודת זהות' }] },
} satisfies TemplateEntry
