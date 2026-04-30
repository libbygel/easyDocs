import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, footer, noteBox } from './_styles.ts'

interface DocItem { doc_name: string; status?: string }
interface Props { recipientName?: string; caseTitle?: string; senderName?: string; note?: string; documents?: DocItem[] }

const DocumentsToAdvisorEmail = ({ recipientName = 'נמען', caseTitle = '', senderName = 'EasyDocs', note, documents = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>מסמכים לתיק {caseTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>מסמכים לתיק: {caseTitle}</Heading>
          <Text style={text}>שלום {recipientName},</Text>
          <Text style={text}>מצורפים מסמכים לתיק <strong>{caseTitle}</strong>:</Text>
          {note && <Section style={noteBox}><Text style={{ ...text, margin: 0 }}>{note}</Text></Section>}
          {documents.map((d, i) => (
            <Text key={i} style={{ ...text, padding: '8px 0', borderBottom: '1px solid #e5e7eb', margin: 0 }}>
              {d.doc_name} {d.status === 'failed' ? '— ❌ שגיאה בהורדה' : '— ✅ מצורף'}
            </Text>
          ))}
          <Text style={{ ...text, fontSize: '13px', color: '#666', marginTop: '16px' }}>הקבצים מצורפים למייל זה.</Text>
        </Section>
        <Section style={footer}>נשלח מ-{senderName}</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DocumentsToAdvisorEmail,
  subject: (data: Props) => `מסמכים לתיק: ${data?.caseTitle ?? ''}`,
  displayName: 'שליחת מסמכים לבנקאי',
  previewData: { recipientName: 'בנקאי יקר', caseTitle: 'משכנתא 2025', senderName: 'דנה לוי', note: 'מצורפים המסמכים לבדיקה', documents: [{ doc_name: 'תלוש שכר' }] },
} satisfies TemplateEntry