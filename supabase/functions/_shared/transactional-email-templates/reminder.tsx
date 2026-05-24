import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, button, buttonWrap, footer, noteBox, docBox, docsWrap, muted } from './_styles.ts'

interface DocItem { doc_name: string; review_status?: string; due_date?: string | null; advisor_note?: string | null }
interface Props {
  clientName?: string
  caseTitle?: string
  portalUrl?: string
  personalMessage?: string
  advisorName?: string
  missingDocs?: DocItem[]
}

const ReminderEmail = ({ clientName = 'לקוח/ה יקר/ה', caseTitle = '', portalUrl = '#', personalMessage, advisorName, missingDocs = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head><meta charSet="utf-8" /><meta httpEquiv="Content-Type" content="text/html; charset=utf-8" /></Head>
    <Preview>תזכורת על מסמכים חסרים בתיק {caseTitle}</Preview>
    <Body style={{ ...main, direction: 'rtl', textAlign: 'right' }} dir="rtl">
      <Container style={{ ...container, direction: 'rtl', textAlign: 'right' }} dir="rtl">
        <Section style={{ ...heroBox, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...heroTitle, textAlign: 'right' }}>📋 EasyDocs</Heading>
          {advisorName && <Text style={{ ...heroSub, textAlign: 'right' }} dir="rtl">מאת {advisorName}</Text>}
        </Section>
        <Section style={{ ...card, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...h1, textAlign: 'right' }} dir="rtl">שלום {clientName},</Heading>
          <Text style={{ ...text, textAlign: 'right', direction: 'rtl', unicodeBidi: 'embed' }} dir="rtl">
            זוהי תזכורת{advisorName ? ` מ-${advisorName}` : ''} בנוגע למסמכים שטרם הועלו לתיק: <strong>{caseTitle}</strong>
          </Text>
          {personalMessage && (
            <Section style={{ ...noteBox, direction: 'rtl', textAlign: 'right' }} dir="rtl">
              <Text style={{ ...text, color: '#1e40af', margin: '0 0 4px', fontWeight: 600, direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">💬 הודעה מהיועץ:</Text>
              <Text style={{ ...text, color: '#1e3a5f', whiteSpace: 'pre-wrap', margin: 0, direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">{personalMessage}</Text>
            </Section>
          )}
          {missingDocs.length > 0 && (
            <Section style={{ ...docsWrap, direction: 'rtl', textAlign: 'right' }} dir="rtl">
              <Text style={{ ...text, fontWeight: 600, color: '#334155', margin: '0 0 16px', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">📄 מסמכים נדרשים ({missingDocs.length}):</Text>
              {missingDocs.map((doc, i) => {
                const isRejected = doc.review_status === 'לא תקין'
                return (
                  <Section key={i} style={{ ...docBox, direction: 'rtl', textAlign: 'right' }} dir="rtl">
                    <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">{doc.doc_name}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: '13px', color: isRejected ? '#dc2626' : '#d97706', fontWeight: 500, direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">
                      {isRejected ? '❌ נדחה - נדרש העלאה מחדש' : '⏳ טרם הועלה'}
                    </Text>
                    {doc.advisor_note && <Text style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">💬 {doc.advisor_note}</Text>}
                    {doc.due_date && <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#dc2626', direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }} dir="rtl">📅 תאריך יעד: {new Date(doc.due_date).toLocaleDateString('he-IL')}</Text>}
                  </Section>
                )
              })}
            </Section>
          )}
          <Section style={buttonWrap}>
            <Button href={portalUrl} style={button}>העלאת מסמכים ←</Button>
          </Section>
          <Text style={{ ...muted, textAlign: 'center' }}>לחץ על הכפתור כדי לעבור לפורטל ולהעלות את המסמכים</Text>
        </Section>
        <Section style={{ ...footer, direction: 'rtl' }} dir="rtl">הודעה זו נשלחה אוטומטית ממערכת EasyDocs.</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReminderEmail,
  subject: (data: Props) => data?.advisorName ? `תזכורת מ${data.advisorName}: מסמכים חסרים לתיק ${data?.caseTitle ?? ''}` : `תזכורת: מסמכים חסרים לתיק ${data?.caseTitle ?? ''}`,
  displayName: 'תזכורת על מסמכים חסרים',
  previewData: { clientName: 'יוסי כהן', caseTitle: 'משכנתא 2025', portalUrl: 'https://easydocs.tech/portal/abc', advisorName: 'דנה לוי', missingDocs: [{ doc_name: 'תלוש שכר', review_status: 'ממתין' }] },
} satisfies TemplateEntry