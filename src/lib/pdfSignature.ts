import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import assistantFontUrl from '@/assets/fonts/Assistant.ttf';

interface SignerDetails {
  fullName: string;
  idNumber: string;
  declarationStatement?: string;
}

interface SignatureResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Creates a signature page with signer details and embeds the signature
 * Returns a result object with success status and either blob or error
 */
export async function embedSignatureInPdf(
  pdfUrl: string,
  signatureDataUrl: string,
  signerDetails?: SignerDetails
): Promise<Blob> {
  console.log('pdfSignature: Starting PDF signature embedding...');
  
  // Step 1: Fetch and load the original PDF
  let pdfBytes: ArrayBuffer;
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    pdfBytes = await response.arrayBuffer();
    console.log('pdfSignature: Original PDF loaded, size:', pdfBytes.byteLength);
  } catch (fetchError: any) {
    console.error('pdfSignature: Failed to fetch original PDF:', fetchError);
    throw new Error(`שגיאה בטעינת המסמך המקורי: ${fetchError.message}`);
  }
  
  // Step 2: Load PDF document
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('pdfSignature: PDF document parsed, pages:', pdfDoc.getPageCount());
  } catch (loadError: any) {
    console.error('pdfSignature: Failed to parse PDF:', loadError);
    throw new Error(`שגיאה בקריאת המסמך: ${loadError.message}`);
  }
  
  // Step 3: Get page dimensions from first page
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('המסמך ריק - אין דפים');
  }
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  console.log('pdfSignature: Page dimensions:', width, 'x', height);
  
  // Step 4: Add a NEW page at the end (critical - this is a dedicated signature page)
  const signaturePage = pdfDoc.addPage([width, height]);
  console.log('pdfSignature: New signature page added, total pages now:', pdfDoc.getPageCount());
  
  // Step 5: Embed fonts - try Hebrew font first, fallback to standard
  let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let hebrewFontLoaded = false;
  
  try {
    pdfDoc.registerFontkit(fontkit);
    console.log('pdfSignature: Fontkit registered');
    
    const fontResponse = await fetch(assistantFontUrl);
    if (!fontResponse.ok) {
      throw new Error(`Font fetch failed: ${fontResponse.status}`);
    }
    const fontBytes = await fontResponse.arrayBuffer();
    console.log('pdfSignature: Hebrew font loaded, size:', fontBytes.byteLength);
    
    const embeddedFont = await pdfDoc.embedFont(fontBytes, { subset: true });
    font = embeddedFont;
    boldFont = embeddedFont; // Assistant doesn't have bold, but use same font
    hebrewFontLoaded = true;
    console.log('pdfSignature: Hebrew font embedded successfully');
  } catch (fontError: any) {
    console.warn('pdfSignature: Hebrew font failed, using fallback:', fontError.message);
    // Continue with standard fonts - Hebrew will show as boxes but won't crash
  }
  
  // Page styling colors
  const primaryColor = rgb(0.145, 0.388, 0.922); // #2563EB
  const textColor = rgb(0.1, 0.1, 0.1);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const borderColor = rgb(0.8, 0.8, 0.8);
  const lightBlue = rgb(0.98, 0.98, 1);
  
  const margin = 50;
  const contentWidth = width - (margin * 2);
  let currentY = height - margin;
  
  // === HEADER SECTION ===
  signaturePage.drawRectangle({
    x: margin,
    y: height - 120,
    width: contentWidth,
    height: 70,
    color: lightGray,
    borderColor: primaryColor,
    borderWidth: 2,
  });
  
  // Header title - bilingual for clarity
  signaturePage.drawText('SIGNATURE PAGE', {
    x: width / 2 - 60,
    y: height - 75,
    size: 18,
    font: boldFont,
    color: primaryColor,
  });
  
  // Hebrew subtitle if font is available
  if (hebrewFontLoaded) {
    const hebrewTitle = 'עמוד חתימה';
    signaturePage.drawText(hebrewTitle, {
      x: width / 2 - 30,
      y: height - 95,
      size: 12,
      font: font,
      color: primaryColor,
    });
  }
  
  signaturePage.drawText('Document Signature Confirmation', {
    x: width / 2 - 90,
    y: height - 110,
    size: 10,
    font: font,
    color: textColor,
  });
  
  currentY = height - 160;
  
  // === SIGNER DETAILS SECTION ===
  signaturePage.drawRectangle({
    x: margin,
    y: currentY - 120,
    width: contentWidth,
    height: 120,
    color: rgb(1, 1, 1),
    borderColor: borderColor,
    borderWidth: 1,
  });
  
  signaturePage.drawText('Signer Details', {
    x: margin + 15,
    y: currentY - 25,
    size: 14,
    font: boldFont,
    color: primaryColor,
  });
  
  const fieldY = currentY - 55;
  const fieldSpacing = 30;
  
  // Full Name - handle Hebrew with reversal if font is loaded
  signaturePage.drawText('Full Name:', {
    x: margin + 15,
    y: fieldY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  
  const fullNameText = signerDetails?.fullName || '___________________';
  const displayName = fullNameText;
  signaturePage.drawText(displayName, {
    x: margin + 100,
    y: fieldY,
    size: 11,
    font: font,
    color: textColor,
  });
  
  // ID Number (always LTR numbers)
  signaturePage.drawText('ID Number:', {
    x: margin + 15,
    y: fieldY - fieldSpacing,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  signaturePage.drawText(signerDetails?.idNumber || '___________________', {
    x: margin + 100,
    y: fieldY - fieldSpacing,
    size: 11,
    font: font,
    color: textColor,
  });
  
  // Date - use DD/MM/YYYY format (universal)
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  signaturePage.drawText('Date:', {
    x: margin + 15,
    y: fieldY - (fieldSpacing * 2),
    size: 11,
    font: boldFont,
    color: textColor,
  });
  signaturePage.drawText(`${dateStr} ${timeStr}`, {
    x: margin + 100,
    y: fieldY - (fieldSpacing * 2),
    size: 11,
    font: font,
    color: textColor,
  });
  
  currentY = currentY - 150;
  
  // === DECLARATION SECTION (render BEFORE signature for logical flow) ===
  const declarationText = signerDetails?.declarationStatement;
  if (declarationText) {
    // Word wrap the declaration text
    const maxCharsPerLine = 70;
    const words = declarationText.split(' ');
    const declarationLines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) declarationLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) declarationLines.push(currentLine);
    
    const lineHeight = 18;
    const declarationHeight = 50 + (declarationLines.length * lineHeight);
    
    signaturePage.drawRectangle({
      x: margin,
      y: currentY - declarationHeight,
      width: contentWidth,
      height: declarationHeight,
      color: lightBlue,
      borderColor: primaryColor,
      borderWidth: 1,
    });
    
    // Declaration header
    const declarationHeader = hebrewFontLoaded ? 'הצהרה' : 'Declaration';
    signaturePage.drawText(declarationHeader, {
      x: margin + 15,
      y: currentY - 22,
      size: 12,
      font: boldFont,
      color: primaryColor,
    });
    
    // Declaration text lines
    let declarationY = currentY - 42;
    declarationLines.forEach((line) => {
      const displayLine = line;
      signaturePage.drawText(displayLine, {
        x: margin + 15,
        y: declarationY,
        size: 10,
        font: font,
        color: textColor,
      });
      declarationY -= lineHeight;
    });
    
    currentY = currentY - declarationHeight - 20;
  }
  
  // === SIGNATURE SECTION ===
  const sigBoxHeight = 150;
  
  signaturePage.drawRectangle({
    x: margin,
    y: currentY - sigBoxHeight,
    width: contentWidth,
    height: sigBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: primaryColor,
    borderWidth: 2,
  });
  
  const sigLabel = hebrewFontLoaded ? 'חתימה' : 'Signature';
  signaturePage.drawText(sigLabel, {
    x: margin + 15,
    y: currentY - 25,
    size: 14,
    font: boldFont,
    color: primaryColor,
  });
  
  // Step 6: Embed signature image
  let signatureImage;
  try {
    const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
    console.log('pdfSignature: Signature image loaded, size:', signatureImageBytes.byteLength);
    signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    console.log('pdfSignature: Signature image embedded');
  } catch (sigError: any) {
    console.error('pdfSignature: Failed to embed signature:', sigError);
    throw new Error(`שגיאה בהטמעת החתימה: ${sigError.message}`);
  }
  
  // Calculate signature dimensions to fit within box
  const maxSigWidth = contentWidth - 40;
  const maxSigHeight = sigBoxHeight - 60;
  const sigDims = signatureImage.scale(1);
  let sigWidth = sigDims.width;
  let sigHeight = sigDims.height;
  
  if (sigWidth > maxSigWidth) {
    const scale = maxSigWidth / sigWidth;
    sigWidth = maxSigWidth;
    sigHeight = sigHeight * scale;
  }
  
  if (sigHeight > maxSigHeight) {
    const scale = maxSigHeight / sigHeight;
    sigHeight = maxSigHeight;
    sigWidth = sigWidth * scale;
  }
  
  // Center signature in box
  const sigX = margin + (contentWidth - sigWidth) / 2;
  const sigY = currentY - sigBoxHeight + (sigBoxHeight - sigHeight) / 2 - 10;
  
  signaturePage.drawImage(signatureImage, {
    x: sigX,
    y: sigY,
    width: sigWidth,
    height: sigHeight,
  });
  
  currentY = currentY - sigBoxHeight - 20;
  
  // === LEGAL DISCLAIMER ===
  const disclaimerHeight = 70;
  signaturePage.drawRectangle({
    x: margin,
    y: currentY - disclaimerHeight,
    width: contentWidth,
    height: disclaimerHeight,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 1,
  });
  
  const disclaimerLines = [
    'I hereby confirm that I have read and understood the contents of this document.',
    'By signing, I acknowledge my agreement to the terms stated herein.',
    `Digitally signed on ${dateStr} at ${timeStr}.`,
  ];
  
  let disclaimerY = currentY - 20;
  disclaimerLines.forEach((line) => {
    signaturePage.drawText(line, {
      x: margin + 15,
      y: disclaimerY,
      size: 9,
      font: font,
      color: textColor,
    });
    disclaimerY -= 16;
  });
  
  // === FOOTER ===
  signaturePage.drawText('This is a digitally signed document', {
    x: width / 2 - 80,
    y: 30,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Step 7: Save the PDF
  let signedPdfBytes: Uint8Array;
  try {
    signedPdfBytes = await pdfDoc.save();
    console.log('pdfSignature: PDF saved successfully, size:', signedPdfBytes.byteLength);
  } catch (saveError: any) {
    console.error('pdfSignature: Failed to save PDF:', saveError);
    throw new Error(`שגיאה בשמירת המסמך החתום: ${saveError.message}`);
  }
  
  return new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });
}

/**
 * Generates a sanitized filename for the signed PDF
 * Removes Hebrew and special characters to prevent storage issues
 */
export function getSignedFileName(originalFileName: string): string {
  // Remove .pdf extension
  let baseName = originalFileName.replace(/\.pdf$/i, '');
  
  // Remove non-ASCII characters (including Hebrew)
  baseName = baseName.replace(/[^\x00-\x7F]/g, '');
  
  // Replace spaces and special characters with underscores
  baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Remove consecutive underscores
  baseName = baseName.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  baseName = baseName.replace(/^_+|_+$/g, '');
  
  // If nothing left after sanitization, use timestamp
  if (!baseName) {
    baseName = `document_${Date.now()}`;
  }
  
  return `${baseName}_signed.pdf`;
}
