const SCRIPT_PATTERNS: RegExp[] = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /\bon\w+\s*=/i,
];

export interface TextValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  allowNewLines?: boolean;
}

export interface ValidationResult {
  ok: boolean;
  value: string;
  error?: string;
}

export function sanitizeTextInput(value: unknown, allowNewLines = false): string {
  if (typeof value !== 'string') return '';

  const withoutNulls = value.replace(/\0/g, '');
  const noControlChars = allowNewLines
    ? withoutNulls.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : withoutNulls.replace(/[\u0000-\u001F\u007F]/g, '');

  const normalizedWhitespace = allowNewLines
    ? noControlChars.replace(/[ \t]+/g, ' ').trim()
    : noControlChars.replace(/\s+/g, ' ').trim();

  return normalizedWhitespace;
}

export function hasSuspiciousScriptContent(value: string): boolean {
  return SCRIPT_PATTERNS.some((pattern) => pattern.test(value));
}

export function validateTextField(
  fieldName: string,
  rawValue: unknown,
  options: TextValidationOptions = {},
): ValidationResult {
  const {
    required = false,
    minLength = 0,
    maxLength = 500,
    allowNewLines = false,
  } = options;

  const value = sanitizeTextInput(rawValue, allowNewLines);

  if (required && value.length === 0) {
    return { ok: false, value, error: `${fieldName} is required` };
  }

  if (value.length === 0) {
    return { ok: true, value };
  }

  if (value.length < minLength) {
    return { ok: false, value, error: `${fieldName} is too short` };
  }

  if (value.length > maxLength) {
    return { ok: false, value, error: `${fieldName} is too long` };
  }

  if (hasSuspiciousScriptContent(value)) {
    return { ok: false, value, error: `${fieldName} contains forbidden content` };
  }

  return { ok: true, value };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9+()\-\s]{7,20}$/.test(phone);
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidSafeToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,220}$/.test(value);
}
