import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, card, h1, text, button, buttonWrap, footer, docBox, docsWrap } from './_styles.ts'

interface UrgentDoc { doc_name: string; due_date?: string; case_title?: string; days_left?: number }
interface Props { clientName?: string; portalUrl?: string; urgentDocs?: UrgentDoc[] }

const UrgentDocumentsEmail = ({ clientName = 'לקוח/ה יקר/ה', portalUrl = '#', urgentDocs = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>⚠️ מסמכים דחופים — תאריך יעד מתקרב</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={{ ...h1, color: '#dc2626' }}>⚠️ מסמכים דחופים</Heading>
          <Text style={text}>שלום {clientName},</Text>
          <Text style={text}>תאריך היעד למסמכים הבאים מתקרב:</Text>
          <Section style={docsWrap}>
            {urgentDocs.map((d, i) => (
              <Section key={i} style={docBox}>
                <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{d.doc_name}</Text>
                {d.case_title && <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>תיק: {d.case_title}</Text>}
                {d.due_date && <Text style={{ margin: '6px 0 0', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>📅 תאריך יעד: {new Date(d.due_date).toLocaleDateString('he-IL')}</Text>}
              </Section>
            ))}
          </Section>
          <Section style={buttonWrap}>
            <Button href={portalUrl} style={button}>העלאת מסמכים</Button>
          </Section>
        </Section>
        <Section style={footer}>EasyDocs</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UrgentDocumentsEmail,
  subject: '⚠️ מסמכים דחופים — תאריך יעד מתקרב',
  displayName: 'התראה על מסמכים דחופים',
  previewData: { clientName: 'יוסי כהן', portalUrl: 'https://easydocs.tech/portal/abc', urgentDocs: [{ doc_name: 'תלוש שכר', due_date: '2026-05-05', case_title: 'משכנתא' }] },
} satisfies TemplateEntry