import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
}

// Helper to reverse Hebrew text for PDF (jsPDF doesn't support RTL well)
const reverseHebrew = (text: string): string => {
  return text.split('').reverse().join('');
};

export const exportActivityLogToPDF = (
  activities: ActivityLog[],
  caseTitle: string
): void => {
  const doc = new jsPDF();
  
  doc.setFont('helvetica');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  const title = reverseHebrew('יומן פעילות');
  doc.text(title, pageWidth - 20, 25, { align: 'right' });
  
  // Case title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(reverseHebrew(caseTitle), pageWidth - 20, 35, { align: 'right' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${reverseHebrew('תאריך הפקה:')} ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 20, 43, { align: 'right' });
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 48, pageWidth - 20, 48);
  
  // Summary
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`${reverseHebrew('סה"כ פעולות:')} ${activities.length}`, pageWidth - 20, 56, { align: 'right' });
  
  // Prepare table data
  const tableData = activities.map(activity => [
    reverseHebrew(activity.description.substring(0, 60) + (activity.description.length > 60 ? '...' : '')),
    reverseHebrew(activity.action_type),
    format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm'),
  ]);
  
  // Add table using autoTable
  (doc as any).autoTable({
    startY: 62,
    head: [[
      reverseHebrew('תיאור'),
      reverseHebrew('סוג פעולה'),
      reverseHebrew('תאריך ושעה'),
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      halign: 'right',
      fontSize: 10,
    },
    bodyStyles: {
      halign: 'right',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
    },
    margin: { right: 20, left: 20 },
    tableWidth: 'auto',
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    
    const footerText = reverseHebrew('הופק על ידי מערכת איסוף מסמכים חכם');
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    doc.text(`${i} / ${pageCount}`, 20, doc.internal.pageSize.getHeight() - 10);
  }
  
  // Save the PDF
  const fileName = `activity_log_${caseTitle.replace(/[^a-zA-Z0-9א-ת]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

export const exportActivityLogToExcel = (
  activities: ActivityLog[],
  caseTitle: string
): void => {
  // Prepare data for Excel
  const excelData = activities.map(activity => ({
    'תאריך ושעה': format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm'),
    'סוג פעולה': activity.action_type,
    'תיאור': activity.description,
  }));
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 18 }, // תאריך ושעה
    { wch: 15 }, // סוג פעולה
    { wch: 50 }, // תיאור
  ];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'יומן פעילות');
  
  // Save the file
  const fileName = `activity_log_${caseTitle.replace(/[^a-zA-Z0-9א-ת]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
