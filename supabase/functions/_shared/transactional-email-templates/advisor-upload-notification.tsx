import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, footer } from './_styles.ts'

interface Props { advisorName?: string; clientName?: string; caseTitle?: string; documentNames?: string[] }

const AdvisorUploadEmail = ({ advisorName = 'יועץ יקר', clientName = '', caseTitle = '', documentNames = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>הלקוח {clientName} העלה מסמכים</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={h1}>שלום {advisorName},</Heading>
          <Text style={text}>הלקוח <strong>{clientName}</strong> העלה מסמכים לתיק: <strong>{caseTitle}</strong></Text>
          <Text style={{ ...text, fontWeight: 600, marginTop: '20px' }}>המסמכים שהועלו:</Text>
          {documentNames.map((d, i) => (
            <Text key={i} style={{ ...text, padding: '8px 0', borderBottom: '1px solid #eee', margin: 0 }}>• {d}</Text>
          ))}
          <Text style={{ ...text, marginTop: '20px' }}>כדי לצפות במסמכים, היכנס למערכת ופתח את התיק.</Text>
        </Section>
        <Section style={footer}>EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdvisorUploadEmail,
  subject: (data: Props) => `הלקוח ${data?.clientName ?? ''} העלה מסמכים - ${data?.caseTitle ?? ''}`,
  displayName: 'התראה על העלאת מסמכים מהלקוח',
  previewData: { advisorName: 'דנה לוי', clientName: 'יוסי כהן', caseTitle: 'משכנתא 2025', documentNames: ['תלוש שכר', 'תעודת זהות'] },
} satisfies TemplateEntry