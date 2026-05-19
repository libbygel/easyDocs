import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, heroBox, heroTitle, heroSub, card, h1, text, button, buttonWrap, footer, docsWrap, docBox, muted } from './_styles.ts'

interface Props {
  clientName?: string
  caseTitle?: string
  portalLink?: string
  advisorName?: string
  emailType?: 'new_case' | 'reminder' | 'new_document' | 'master_portal'
  requiredDocuments?: string[]
}

function getTitle(emailType?: string, advisorName?: string, caseTitle?: string) {
  switch (emailType) {
    case 'new_case':
      return advisorName ? `${advisorName} פתח/ה עבורך תיק חדש - ${caseTitle}` : `נפתח תיק חדש - ${caseTitle}`
    case 'new_document':
      return advisorName ? `${advisorName} הוסיף/ה מסמך חדש לתיק ${caseTitle}` : `נוסף מסמך חדש לתיק - ${caseTitle}`
    case 'master_portal':
      return advisorName ? `${advisorName} שלח/ה לך קישור לצפייה בתיקים שלך` : `קישור לצפייה בתיקים שלך`
    default:
      return `תזכורת: מסמכים ממתינים - ${caseTitle}`
  }
}

function getBody(emailType?: string, advisorName?: string, caseTitle?: string) {
  switch (emailType) {
    case 'new_case':
      return advisorName
        ? `נפתח עבורך תיק חדש על ידי ${advisorName}: ${caseTitle}. להלן רשימת המסמכים הנדרשים.`
        : `נפתח עבורך תיק חדש: ${caseTitle}. להלן רשימת המסמכים הנדרשים.`
    case 'new_document':
      return advisorName
        ? `${advisorName} הוסיף/ה מסמך חדש לתיק ${caseTitle} שדורש את טיפולך.`
        : `נוסף מסמך חדש לתיק ${caseTitle} שדורש את טיפולך.`
    case 'master_portal':
      return advisorName
        ? `קיבלת מ-${advisorName} קישור לצפייה בכל התיקים שלך באזור האישי. הקישור מיועד לצפייה בלבד.`
        : `קיבלת קישור לצפייה בכל התיקים שלך באזור האישי. הקישור מיועד לצפייה בלבד.`
    default:
      return advisorName
        ? `זוהי תזכורת מ-${advisorName} בנוגע לתיק ${caseTitle} — ישנם מסמכים שעדיין ממתינים להעלאה.`
        : `זוהי תזכורת בנוגע לתיק ${caseTitle} — ישנם מסמכים שעדיין ממתינים להעלאה.`
  }
}

const PortalLinkEmail = ({ clientName = 'לקוח/ה יקר/ה', caseTitle = '', portalLink = '#', advisorName, emailType = 'reminder', requiredDocuments = [] }: Props) => (
  <Html lang="he" dir="rtl">
    <Head><meta charSet="utf-8" /><meta httpEquiv="Content-Type" content="text/html; charset=utf-8" /></Head>
    <Preview>{getTitle(emailType, advisorName, caseTitle)}</Preview>
    <Body style={{ ...main, direction: 'rtl', textAlign: 'right' }} dir="rtl">
      <Container style={{ ...container, direction: 'rtl', textAlign: 'right' }} dir="rtl">
        <Section style={{ ...heroBox, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...heroTitle, textAlign: 'right' }}>📋 EasyDocs</Heading>
          {advisorName && <Text style={{ ...heroSub, textAlign: 'right' }} dir="rtl">מאת {advisorName}</Text>}
        </Section>
        <Section style={{ ...card, direction: 'rtl', textAlign: 'right' }} dir="rtl">
          <Heading style={{ ...h1, textAlign: 'right' }} dir="rtl">שלום {clientName},</Heading>
          <Text style={{ ...text, textAlign: 'right', direction: 'rtl' }} dir="rtl">{getBody(emailType, advisorName, caseTitle)}</Text>
          {emailType !== 'master_portal' && requiredDocuments.length > 0 && (
            <Section style={{ ...docsWrap, textAlign: 'right', direction: 'rtl' }} dir="rtl">
              <Text style={{ ...muted, textAlign: 'right' }} dir="rtl">מסמכים נדרשים להעלאה:</Text>
              {requiredDocuments.map((doc, idx) => (
                <Text key={`${doc}-${idx}`} style={{ ...docBox, textAlign: 'right', direction: 'rtl' }} dir="rtl">• {doc}</Text>
              ))}
            </Section>
          )}
          <Section style={buttonWrap}>
            <Button href={portalLink} style={button}>{emailType === 'master_portal' ? 'צפייה בתיקים' : 'פתיחת הפורטל'}</Button>
          </Section>
        </Section>
        <Section style={footer} dir="rtl">הודעה זו נשלחה ממערכת EasyDocs.</Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PortalLinkEmail,
  subject: (data: Props) => getTitle(data?.emailType, data?.advisorName, data?.caseTitle),
  displayName: 'קישור לפורטל לקוח',
  previewData: { clientName: 'יוסי כהן', caseTitle: 'משכנתא 2025', portalLink: 'https://easydocs.tech/portal/abc', advisorName: 'דנה לוי', emailType: 'new_case' },
} satisfies TemplateEntry