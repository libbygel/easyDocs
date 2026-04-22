/**
 * Predefined Israeli tax-advisor templates (case types + their document checklists).
 * Each item becomes a `case_type` and its docs become `doc_templates` rows.
 * `required: true` means CRITICAL (advisor must collect before considering case ready).
 */
export interface TaxTemplateSeed {
  caseTypeName: string;
  documents: Array<{
    doc_name: string;
    required: boolean; // critical
  }>;
}

export const TAX_TEMPLATES_SEED: TaxTemplateSeed[] = [
  {
    caseTypeName: 'שכיר',
    documents: [
      { doc_name: 'טופס 106 (לכל שנה)', required: true },
      { doc_name: 'תלושי שכר אחרונים', required: true },
      { doc_name: 'צילום תעודת זהות + ספח', required: true },
      { doc_name: 'אישור ניכוי מס במקור', required: false },
      { doc_name: 'אישורי הפקדות לקופות גמל / השתלמות', required: false },
      { doc_name: 'אישורי תרומות (סעיף 46)', required: false },
      { doc_name: 'פרטי חשבון בנק להחזר', required: true },
    ],
  },
  {
    caseTypeName: 'עצמאי',
    documents: [
      { doc_name: 'דוח רווח והפסד שנתי', required: true },
      { doc_name: 'מאזן בוחן', required: true },
      { doc_name: 'ספרי הכנסות והוצאות', required: true },
      { doc_name: 'אישור ניהול ספרים', required: true },
      { doc_name: 'דוחות מע״מ שנתיים', required: true },
      { doc_name: 'אישורי ניכויים במקור (טופס 857)', required: true },
      { doc_name: 'קבלות הוצאות מוכרות', required: false },
      { doc_name: 'אישורי הפקדות לקרן השתלמות / קופ״ג', required: false },
      { doc_name: 'צילום תעודת זהות + ספח', required: true },
      { doc_name: 'פרטי חשבון בנק', required: true },
    ],
  },
  {
    caseTypeName: 'שכיר + עצמאי',
    documents: [
      { doc_name: 'טופס 106 ממקום עבודה', required: true },
      { doc_name: 'תלושי שכר אחרונים', required: true },
      { doc_name: 'דוח רווח והפסד מהעסק', required: true },
      { doc_name: 'מאזן בוחן', required: true },
      { doc_name: 'אישור ניהול ספרים', required: true },
      { doc_name: 'דוחות מע״מ', required: true },
      { doc_name: 'אישורי ניכויים במקור', required: true },
      { doc_name: 'אישורי הפקדות לקופות גמל / השתלמות', required: false },
      { doc_name: 'קבלות הוצאות מוכרות', required: false },
      { doc_name: 'צילום תעודת זהות + ספח', required: true },
      { doc_name: 'פרטי חשבון בנק', required: true },
    ],
  },
  {
    caseTypeName: 'החזר מס',
    documents: [
      { doc_name: 'טפסי 106 לשנים הרלוונטיות', required: true },
      { doc_name: 'אישורי הפקדות לקופות גמל / השתלמות', required: false },
      { doc_name: 'אישורי תרומות (סעיף 46)', required: false },
      { doc_name: 'אישור על הוצאות לימודי ילד / מקצוע', required: false },
      { doc_name: 'אישור על הכרה בנכות (אם רלוונטי)', required: false },
      { doc_name: 'אישור על תושבות בישוב מזכה (אם רלוונטי)', required: false },
      { doc_name: 'צילום תעודת זהות + ספח', required: true },
      { doc_name: 'פרטי חשבון בנק להחזר', required: true },
      { doc_name: 'ייפוי כוח חתום', required: true },
    ],
  },
  {
    caseTypeName: 'הצהרת הון',
    documents: [
      { doc_name: 'דפי בנק לסוף השנה (כל החשבונות)', required: true },
      { doc_name: 'יתרות הלוואות (משכנתאות / הלוואות בנק)', required: true },
      { doc_name: 'אישורי תיקי השקעות / ניירות ערך', required: true },
      { doc_name: 'אישורי קופות גמל / השתלמות / פנסיה', required: true },
      { doc_name: 'נסחי טאבו / חוזי דירות בבעלות', required: true },
      { doc_name: 'רישיון רכב + שווי שוק', required: false },
      { doc_name: 'רשימת תכשיטים / מטלטלין יקרי ערך', required: false },
      { doc_name: 'יתרות חייבים / זכאים', required: false },
      { doc_name: 'הצהרת הון קודמת (אם קיימת)', required: false },
      { doc_name: 'צילום תעודת זהות + ספח', required: true },
    ],
  },
];