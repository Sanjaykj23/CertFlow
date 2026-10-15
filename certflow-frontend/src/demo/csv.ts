/** CSV parsing/validation mirroring the Java CsvStreamingParser used by the real backend. */
import { uuid, isEmail } from './util';

export interface CsvRow {
  rowIndex: number;
  participantName: string;
  email: string;
  certificateType: string;
  valid: boolean;
  errorMessage: string | null;
}
export interface CsvRowError {
  rowIndex: number;
  field: string;
  rawValue: string | null;
  message: string;
}
export interface CsvResult {
  importId: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateEmailCount: number;
  previewRows: CsvRow[];
  errors: CsvRowError[];
}

/** RFC 4180 style parser: quoted fields, escaped quotes, CRLF/LF, BOM, blank lines skipped. */
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  let any = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
      any = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      any = true;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (any || field.length) {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = '';
      any = false;
    } else {
      field += ch;
      any = true;
    }
  }
  if (any || field.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const NAME_KEYS = ['participant_name', 'name', 'fullname', 'full_name', 'student_name', 'attendee', 'recipient_name', 'recipient'];
const EMAIL_KEYS = ['email', 'email_address', 'emailaddress', 'mail', 'recipient_email'];
const TYPE_KEYS = ['certificate_type', 'type', 'role', 'category', 'award', 'cert_type'];

export function validateCsv(text: string, maxPreview = 50000): CsvResult {
  const importId = uuid();
  const rows = parseCsv(text);
  const errors: CsvRowError[] = [];
  const header = rows.shift();
  let nameIdx = -1;
  let emailIdx = -1;
  let typeIdx = -1;
  if (header) {
    header.forEach((h, idx) => {
      const clean = h.trim().toLowerCase().replace(/ /g, '_').replace(/-/g, '');
      if (nameIdx < 0 && NAME_KEYS.includes(clean)) nameIdx = idx;
      else if (emailIdx < 0 && EMAIL_KEYS.includes(clean)) emailIdx = idx;
      else if (typeIdx < 0 && TYPE_KEYS.includes(clean)) typeIdx = idx;
    });
  }
  if (nameIdx < 0 || emailIdx < 0) {
    errors.push({
      rowIndex: 0,
      field: 'header',
      rawValue: header ? `[${header.join(', ')}]` : 'empty',
      message: "CSV must contain at least name (e.g. 'name' or 'participant_name') and email (e.g. 'email') columns",
    });
    return { importId, totalRows: 0, validRows: 0, invalidRows: 1, duplicateEmailCount: 0, previewRows: [], errors };
  }
  const seen = new Set<string>();
  let valid = 0;
  let invalid = 0;
  let dup = 0;
  const preview: CsvRow[] = [];
  rows.forEach((rec, i) => {
    const rowIndex = i + 1;
    const name = (rec[nameIdx] ?? '').trim();
    const email = (rec[emailIdx] ?? '').trim();
    const certType = typeIdx >= 0 ? (rec[typeIdx] ?? '').trim() : 'Participant';
    const rowErrors: string[] = [];
    if (!name) {
      rowErrors.push('Participant name is missing');
      errors.push({ rowIndex, field: 'participant_name', rawValue: name, message: 'Participant name is required' });
    }
    if (!email) {
      rowErrors.push('Email is missing');
      errors.push({ rowIndex, field: 'email', rawValue: email, message: 'Email is required' });
    } else {
      const clean = email.toLowerCase();
      if (!isEmail(clean)) {
        rowErrors.push('Invalid email format');
        errors.push({ rowIndex, field: 'email', rawValue: email, message: 'Invalid email address' });
      } else if (seen.has(clean)) {
        dup++;
        rowErrors.push('Duplicate email in batch');
        errors.push({ rowIndex, field: 'email', rawValue: email, message: `Duplicate email in batch: ${email}` });
      } else seen.add(clean);
    }
    const ok = rowErrors.length === 0;
    if (ok) valid++;
    else invalid++;
    if (preview.length < maxPreview) {
      preview.push({
        rowIndex,
        participantName: name,
        email,
        certificateType: certType || 'Participant',
        valid: ok,
        errorMessage: ok ? null : rowErrors.join('; '),
      });
    }
  });
  return {
    importId,
    totalRows: rows.length,
    validRows: valid,
    invalidRows: invalid,
    duplicateEmailCount: dup,
    previewRows: preview,
    errors,
  };
}
