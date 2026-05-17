/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as portalLink } from './portal-link.tsx'
import { template as reminder } from './reminder.tsx'
import { template as signatureReceived } from './signature-received.tsx'
import { template as advisorUpload } from './advisor-upload-notification.tsx'
import { template as docsToAdvisor } from './documents-to-advisor.tsx'
import { template as clientSubmission } from './client-submission-notification.tsx'
import { template as groupMessage } from './group-message.tsx'
import { template as dailyRejection } from './daily-rejection.tsx'
import { template as urgentDocs } from './urgent-documents.tsx'
import { template as advisorApproved } from './advisor-approved.tsx'
import { template as adminNewSignup } from './admin-new-signup.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'portal-link': portalLink,
  'reminder': reminder,
  'signature-received': signatureReceived,
  'advisor-upload-notification': advisorUpload,
  'documents-to-advisor': docsToAdvisor,
  'client-submission-notification': clientSubmission,
  'group-message': groupMessage,
  'daily-rejection': dailyRejection,
  'urgent-documents': urgentDocs,
  'advisor-approved': advisorApproved,
  'admin-new-signup': adminNewSignup,
}