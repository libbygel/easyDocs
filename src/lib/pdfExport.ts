import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CaseDocument } from '@/lib/supabase';
import { format } from 'date-fns';
import { reverseHebrewRunsForPdf } from '@/lib/hebrewRtl';
import AssistantFontUrl from '@/assets/fonts/Assistant.ttf';

interface CaseReportData {
  caseTitle: string;
  caseType: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  createdAt: string;
  status: string;
  documents: CaseDocument[];
}

const FONT_NAME = 'Assistant';

async function loadAssistantFont(doc: jsPDF): Promise<void> {
  const response = await fetch(AssistantFontUrl);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  doc.addFileToVFS('Assistant.ttf', base64);
  doc.addFont('Assistant.ttf', FONT_NAME, 'normal');
  doc.setFont(FONT_NAME);
}

const h = (text: string): string => reverseHebrewRunsForPdf(text);

export const generateCaseReport = async (data: CaseReportData): Promise<void> => {
  const doc = new jsPDF();

  await loadAssistantFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text(h('דוח תיק'), pageWidth - 20, 25, { align: 'right' });

  // Case title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(h(data.caseTitle), pageWidth - 20, 35, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 40, pageWidth - 20, 40);

  // Case details
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);

  let yPos = 50;
  const lineHeight = 7;

  doc.text(`${h('לקוח:')} ${h(data.clientName)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  if (data.clientEmail) {
    doc.text(`${h('מייל:')} ${data.clientEmail}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += lineHeight;
  }

  if (data.clientPhone) {
    doc.text(`${h('טלפון:')} ${data.clientPhone}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += lineHeight;
  }

  doc.text(`${h('סוג תיק:')} ${h(data.caseType || '-')}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.text(`${h('סטטוס:')} ${h(data.status)}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.text(`${h('תאריך פתיחה:')} ${format(new Date(data.createdAt), 'dd/MM/yyyy')}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight * 2;

  // Summary stats
  const totalDocs = data.documents.length;
  const approvedDocs = data.documents.filter(d => d.review_status === 'תקין').length;
  const pendingDocs = data.documents.filter(d => d.review_status === 'הועלה').length;
  const missingDocs = data.documents.filter(d => d.review_status === 'חסר').length;
  const rejectedDocs = data.documents.filter(d => d.review_status === 'לא תקין').length;

  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(h('סיכום מסמכים'), pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`${h('סה"כ מסמכים:')} ${totalDocs}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.setTextColor(22, 163, 74);
  doc.text(`${h('אושרו:')} ${approvedDocs}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.setTextColor(234, 179, 8);
  doc.text(`${h('ממתינים לבדיקה:')} ${pendingDocs}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.setTextColor(100, 100, 100);
  doc.text(`${h('חסרים:')} ${missingDocs}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight;

  doc.setTextColor(220, 38, 38);
  doc.text(`${h('נדחו:')} ${rejectedDocs}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += lineHeight * 2;

  // Documents table
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(14);
  doc.text(h('רשימת מסמכים'), pageWidth - 20, yPos, { align: 'right' });
  yPos += 5;

  const tableData = data.documents.map(d => [
    h(d.advisor_note || '-'),
    d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : '-',
    h(d.review_status),
    d.required ? h('כן') : h('לא'),
    h(d.doc_name),
  ]);

  doc.setFont(FONT_NAME, 'normal');

  autoTable(doc, {
    startY: yPos,
    head: [[
      h('הערה'),
      h('תאריך יעד'),
      h('סטטוס'),
      h('נדרש'),
      h('שם מסמך'),
    ]],
    body: tableData,
    theme: 'striped',
    styles: {
      font: FONT_NAME,
      fontStyle: 'normal',
      halign: 'right',
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      halign: 'right',
      fontSize: 10,
      font: FONT_NAME,
      fontStyle: 'normal',
    },
    bodyStyles: {
      halign: 'right',
      fontSize: 9,
      font: FONT_NAME,
      fontStyle: 'normal',
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 50 },
    },
    margin: { right: 20, left: 20 },
    tableWidth: 'auto',
    didParseCell: (data) => {
      data.cell.styles.font = FONT_NAME;
      data.cell.styles.fontStyle = 'normal';
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(FONT_NAME);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);

    const footerText = `${h('הופק על ידי מערכת איסוף מסמכים חכם')} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.text(`${i} / ${pageCount}`, 20, doc.internal.pageSize.getHeight() - 10);
  }

  const fileName = `${data.caseTitle.replace(/[^a-zA-Z0-9א-ת]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
