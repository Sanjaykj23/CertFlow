/**
 * Starter designs for the template gallery. All are A4 landscape (842 x 595 pt)
 * and built only from the design factories, so they render the same everywhere.
 */
import { PLACEHOLDERS, createEllipse, createLine, createQr, createRect, createText } from '../../lib/designer';
import type { Design, DesignElement, FillSpec, TextEl } from '../../lib/designer';

const W = 842;
const H = 595;

const solid = (color: string): FillSpec => ({ kind: 'solid', color });

function nameFor(text: string): string {
  const hit = PLACEHOLDERS.find((p) => text.includes(p.token));
  if (hit && text.trim() === hit.token) return hit.label;
  const clean = text.replace(/\{\{|\}\}/g, '').replace(/\n/g, ' ');
  return clean.length > 24 ? `${clean.slice(0, 22)}...` : clean;
}

/** Text box. Without a width it spans the page with a 60 pt margin and centres. */
function T(text: string, y: number, o: Partial<TextEl> = {}): TextEl {
  return createText({ x: 60, width: W - 120, align: 'center', name: nameFor(text), ...o, text, y });
}

function L(x: number, y: number, width: number, stroke: string, strokeWidth = 1, o: Partial<Parameters<typeof createLine>[0]> = {}) {
  return createLine({ x, y, width, stroke, strokeWidth, ...o });
}

interface SigStyle {
  ink: string;
  line: string;
  label: string;
  font: string;
  labelFont?: string;
}

/** Signature block: optional value above a rule, small caption below. */
function sig(x: number, y: number, w: number, token: string, label: string, s: SigStyle): DesignElement[] {
  const out: DesignElement[] = [];
  if (token) {
    out.push(
      T(token, y - 26, { x, width: w, fontSize: 15, fontFamily: s.font, color: s.ink, name: label, align: 'center' }),
    );
  }
  out.push(L(x, y, w, s.line, 1));
  out.push(
    T(label, y + 7, { x, width: w, fontSize: 8.5, fontFamily: s.labelFont ?? 'Montserrat', color: s.label, letterSpacing: 1.6, bold: true, name: `${label} caption` }),
  );
  return out;
}

function certNumber(y: number, color: string, o: Partial<TextEl> = {}): TextEl {
  return T('{{certificate_number}}', y, { fontFamily: 'Roboto Mono', fontSize: 9, color, letterSpacing: 1, ...o });
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  build: () => Design;
}

function design(fill: FillSpec, elements: DesignElement[]): Design {
  return { version: 2, width: W, height: H, background: { fill, image: null }, elements };
}

/* ------------------------------------------------------------------ */

function classicGold(): Design {
  const gold = '#B8892B';
  const ink = '#1B2A41';
  const s: SigStyle = { ink, line: gold, label: '#5A6678', font: 'Cormorant Garamond' };
  return design(solid('#FBF6EA'), [
    createRect({ name: 'Outer frame', x: 24, y: 24, width: 794, height: 547, fill: null, stroke: gold, strokeWidth: 3 }),
    createRect({ name: 'Inner frame', x: 34, y: 34, width: 774, height: 527, fill: null, stroke: gold, strokeWidth: 1 }),
    createEllipse({ name: 'Corner top left', x: 29, y: 29, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner top right', x: 803, y: 29, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner bottom left', x: 29, y: 556, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner bottom right', x: 803, y: 556, width: 10, height: 10, fill: solid(gold) }),
    T('CERTIFICATE', 70, { name: 'Title', fontFamily: 'Cinzel', fontSize: 50, bold: true, color: ink, letterSpacing: 8 }),
    T('OF {{certificate_type}}', 136, { fontFamily: 'Cinzel', fontSize: 20, color: '#9C6C10', letterSpacing: 6 }),
    L(361, 174, 120, gold, 1.5, { name: 'Title rule' }),
    T('This certificate is proudly presented to', 190, { name: 'Presented to', fontFamily: 'Cormorant Garamond', italic: true, fontSize: 22, color: '#5A6678' }),
    T('{{participant_name}}', 214, { fontFamily: 'Great Vibes', fontSize: 66, color: ink }),
    L(221, 302, 400, gold, 1, { name: 'Name rule' }),
    T('in recognition of outstanding participation in', 318, { name: 'Reason', fontFamily: 'Cormorant Garamond', fontSize: 22, color: '#2B3A52' }),
    T('{{event_name}}', 346, { fontFamily: 'Cormorant Garamond', bold: true, fontSize: 30, color: '#0F1A2B' }),
    ...sig(90, 500, 190, '{{issue_date}}', 'DATE', s),
    ...sig(540, 500, 180, '{{organization_name}}', 'ISSUED BY', s),
    createEllipse({ name: 'Seal', x: 379, y: 442, width: 84, height: 84, fill: solid('#C28A1B'), stroke: '#9C6C10', strokeWidth: 2 }),
    createEllipse({ name: 'Seal ring', x: 388, y: 451, width: 66, height: 66, fill: null, stroke: '#FBF6EA', strokeWidth: 1.5 }),
    certNumber(536, '#8791A1'),
    createQr({ x: 742, y: 486, width: 56, fg: ink, bg: null }),
  ]);
}

function modernTeal(): Design {
  const teal = '#0B6F69';
  const s: SigStyle = { ink: '#0F1A2B', line: '#CBD3DE', label: '#5A6678', font: 'Montserrat' };
  return design(solid('#FFFFFF'), [
    createRect({ name: 'Header band', x: 0, y: 0, width: W, height: 150, fill: solid(teal) }),
    createEllipse({ name: 'Band circle large', x: 690, y: 12, width: 126, height: 126, fill: solid('#12877F') }),
    createEllipse({ name: 'Band circle small', x: 640, y: 76, width: 62, height: 62, fill: solid('#0A5753') }),
    T('CERTIFICATE', 42, { x: 60, width: 520, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 12, color: '#9ED6CF', letterSpacing: 6 }),
    T('of {{certificate_type}}', 62, { x: 60, width: 560, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 34, color: '#FFFFFF', uppercase: true }),
    T('{{organization_name}}', 112, { x: 60, width: 520, align: 'left', fontFamily: 'Montserrat', fontSize: 13, color: '#CBEBE6' }),
    createRect({ name: 'Accent bar', x: 60, y: 186, width: 64, height: 5, fill: solid('#C28A1B') }),
    T('Presented to', 212, { x: 60, width: 500, align: 'left', fontFamily: 'Montserrat', fontSize: 13, color: '#5A6678' }),
    T('{{participant_name}}', 234, { x: 60, width: 722, align: 'left', fontFamily: 'Poppins', bold: true, fontSize: 46, color: '#0F1A2B' }),
    L(60, 304, 420, '#CBD3DE', 1, { name: 'Name rule' }),
    T('in recognition of outstanding contribution to', 322, { name: 'Reason', x: 60, width: 700, align: 'left', fontFamily: 'Montserrat', fontSize: 15, color: '#2B3A52' }),
    T('{{event_name}}', 346, { x: 60, width: 700, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 24, color: teal }),
    ...sig(60, 496, 200, '{{issue_date}}', 'DATE OF ISSUE', s),
    ...sig(290, 496, 200, '', 'AUTHORISED SIGNATURE', s),
    certNumber(526, '#8791A1', { x: 60, width: 300, align: 'left' }),
    createQr({ x: 686, y: 430, width: 100, fg: '#0F1A2B', bg: null }),
    T('Scan to verify', 534, { x: 676, width: 120, fontFamily: 'Montserrat', fontSize: 9, color: '#5A6678', letterSpacing: 1 }),
    createRect({ name: 'Footer band', x: 0, y: 575, width: W, height: 20, fill: solid(teal) }),
  ]);
}

function minimalInk(): Design {
  const ink = '#0F1A2B';
  return design(solid('#FAFBFC'), [
    T('CERTIFICATE', 78, { x: 80, width: 400, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 11, color: ink, letterSpacing: 8 }),
    L(80, 106, 56, '#C28A1B', 2, { name: 'Accent rule' }),
    T('{{certificate_type}}', 168, { x: 80, width: 500, align: 'left', fontFamily: 'Raleway', bold: true, fontSize: 15, color: '#12877F', uppercase: true, letterSpacing: 4 }),
    T('{{participant_name}}', 196, { x: 80, width: 682, align: 'left', fontFamily: 'Playfair Display', fontSize: 58, color: ink }),
    T('for {{event_name}}', 280, { x: 80, width: 682, align: 'left', fontFamily: 'Playfair Display', italic: true, fontSize: 24, color: '#42516A' }),
    T('Issued by {{organization_name}} on {{issue_date}}', 322, { name: 'Issuer line', x: 80, width: 682, align: 'left', fontFamily: 'Raleway', fontSize: 14, color: '#5A6678' }),
    L(80, 500, 682, '#CBD3DE', 1, { name: 'Footer rule' }),
    certNumber(514, '#8791A1', { x: 80, width: 400, align: 'left', fontSize: 10 }),
    T('Verify this certificate with the QR code', 514, { name: 'Verify note', x: 440, width: 322, align: 'right', fontFamily: 'Raleway', fontSize: 10, color: '#8791A1' }),
    createQr({ x: 682, y: 404, width: 80, fg: ink, bg: null }),
  ]);
}

function corporateNavy(): Design {
  const navy = '#0F1A2B';
  const s: SigStyle = { ink: navy, line: '#CBD3DE', label: '#5A6678', font: 'Montserrat' };
  return design(solid('#FFFFFF'), [
    createRect({ name: 'Sidebar', x: 0, y: 0, width: 230, height: H, fill: solid(navy) }),
    createRect({ name: 'Sidebar accent', x: 28, y: 88, width: 40, height: 4, fill: solid('#C28A1B') }),
    T('{{organization_name}}', 46, { x: 28, width: 190, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 15, color: '#FFFFFF' }),
    T('CERTIFICATE NO.', 236, { x: 28, width: 190, align: 'left', fontFamily: 'Roboto Mono', fontSize: 8.5, color: '#8791A1', letterSpacing: 2 }),
    T('{{certificate_number}}', 252, { x: 28, width: 190, align: 'left', fontFamily: 'Roboto Mono', fontSize: 12, color: '#FFFFFF' }),
    createQr({ x: 28, y: 420, width: 116, fg: navy, bg: '#FFFFFF' }),
    T('SCAN TO VERIFY', 546, { x: 28, width: 190, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 8.5, color: '#8791A1', letterSpacing: 2 }),
    T('CERTIFICATE', 82, { x: 280, width: 500, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 12, color: '#12877F', letterSpacing: 6 }),
    T('of {{certificate_type}}', 102, { x: 280, width: 520, align: 'left', fontFamily: 'Oswald', fontSize: 52, color: navy, uppercase: true }),
    L(280, 176, 60, '#12877F', 3, { name: 'Title rule' }),
    T('This is to certify that', 204, { x: 280, width: 520, align: 'left', fontFamily: 'Lora', italic: true, fontSize: 16, color: '#5A6678' }),
    T('{{participant_name}}', 230, { x: 280, width: 520, align: 'left', fontFamily: 'Playfair Display', bold: true, fontSize: 44, color: navy }),
    L(280, 298, 520, '#CBD3DE', 1, { name: 'Name rule' }),
    T('has successfully completed', 314, { x: 280, width: 520, align: 'left', fontFamily: 'Lora', fontSize: 16, color: '#42516A' }),
    T('{{event_name}}', 340, { x: 280, width: 520, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 22, color: '#0B6F69' }),
    ...sig(280, 500, 200, '', 'AUTHORISED SIGNATORY', s),
    ...sig(540, 500, 200, '{{issue_date}}', 'DATE OF ISSUE', s),
  ]);
}

function academicCrest(): Design {
  const navy = '#1B2A41';
  const gold = '#C28A1B';
  const s: SigStyle = { ink: navy, line: gold, label: '#5A6678', font: 'Lora' };
  return design(solid(navy), [
    createRect({ name: 'Paper', x: 22, y: 22, width: 798, height: 551, fill: solid('#FBF8F0') }),
    createRect({ name: 'Gold frame', x: 36, y: 36, width: 770, height: 523, fill: null, stroke: gold, strokeWidth: 1.5 }),
    createEllipse({ name: 'Crest', x: 381, y: 52, width: 80, height: 80, fill: solid(navy), stroke: gold, strokeWidth: 3 }),
    createEllipse({ name: 'Crest ring', x: 391, y: 62, width: 60, height: 60, fill: null, stroke: '#D9A53A', strokeWidth: 1 }),
    createEllipse({ name: 'Crest centre', x: 411, y: 82, width: 20, height: 20, fill: solid(gold) }),
    T('{{organization_name}}', 146, { fontFamily: 'Cinzel', bold: true, fontSize: 18, color: navy, letterSpacing: 5 }),
    T('Certificate of {{certificate_type}}', 176, { name: 'Title', fontFamily: 'Libre Baskerville', fontSize: 32, color: navy }),
    L(361, 226, 120, gold, 1.5, { name: 'Title rule' }),
    T('is hereby awarded to', 240, { fontFamily: 'Lora', italic: true, fontSize: 17, color: '#5A6678' }),
    T('{{participant_name}}', 262, { fontFamily: 'Cormorant Garamond', bold: true, fontSize: 56, color: '#0F1A2B' }),
    L(221, 336, 400, gold, 1, { name: 'Name rule' }),
    T('in recognition of successful participation in', 350, { name: 'Reason', fontFamily: 'Lora', fontSize: 16, color: '#42516A' }),
    T('{{event_name}}', 376, { fontFamily: 'Libre Baskerville', bold: true, fontSize: 21, color: navy }),
    ...sig(90, 502, 190, '{{issue_date}}', 'DATE', s),
    ...sig(562, 502, 190, '', 'SIGNATORY', s),
    createQr({ x: 388, y: 462, width: 66, fg: navy, bg: '#FFFFFF' }),
    certNumber(536, '#8791A1'),
  ]);
}

function hackathonBold(): Design {
  return design(solid('#0F1A2B'), [
    createEllipse({ name: 'Ring', x: 590, y: 40, width: 220, height: 220, fill: null, stroke: '#12877F', strokeWidth: 2 }),
    createEllipse({ name: 'Disc', x: 660, y: 110, width: 150, height: 150, fill: solid('#12877F'), opacity: 0.35 }),
    createEllipse({ name: 'Dot', x: 774, y: 64, width: 26, height: 26, fill: solid('#C28A1B') }),
    T('{{event_name}}', 48, { x: 56, width: 520, align: 'left', fontFamily: 'Roboto Mono', fontSize: 13, color: '#9ED6CF', uppercase: true, letterSpacing: 3 }),
    T('CERTIFICATE', 78, { name: 'Title', x: 56, width: 560, align: 'left', fontFamily: 'Oswald', bold: true, fontSize: 84, color: '#FFFFFF', lineHeight: 1.1 }),
    T('OF {{certificate_type}}', 176, { x: 56, width: 560, align: 'left', fontFamily: 'Oswald', fontSize: 40, color: '#D9A53A', letterSpacing: 2 }),
    createRect({ name: 'Accent bar', x: 56, y: 248, width: 120, height: 10, fill: solid('#12877F') }),
    T('AWARDED TO', 288, { x: 56, width: 400, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 12, color: '#B8C0CC', letterSpacing: 4 }),
    T('{{participant_name}}', 310, { x: 56, width: 730, align: 'left', fontFamily: 'Montserrat', bold: true, fontSize: 44, color: '#FFFFFF' }),
    T('Presented by {{organization_name}}', 376, { name: 'Presented by', x: 56, width: 600, align: 'left', fontFamily: 'Montserrat', fontSize: 16, color: '#9ED6CF' }),
    createQr({ x: 56, y: 440, width: 90, fg: '#0F1A2B', bg: '#FFFFFF' }),
    T('{{issue_date}}', 458, { x: 166, width: 300, align: 'left', fontFamily: 'Roboto Mono', fontSize: 15, color: '#FFFFFF' }),
    T('{{certificate_number}}', 484, { x: 166, width: 300, align: 'left', fontFamily: 'Roboto Mono', fontSize: 12, color: '#9ED6CF' }),
    T('Scan the code to verify this certificate.', 508, { x: 166, width: 400, align: 'left', fontFamily: 'Montserrat', fontSize: 10.5, color: '#8791A1' }),
    createRect({ name: 'Footer band', x: 0, y: 575, width: W, height: 20, fill: solid('#12877F') }),
  ]);
}

function elegantScript(): Design {
  const teal = '#0A5753';
  const gold = '#C28A1B';
  const s: SigStyle = { ink: '#2B3A52', line: gold, label: '#5A6678', font: 'Cormorant Garamond' };
  return design(solid('#FFFBF5'), [
    createRect({ name: 'Outer frame', x: 28, y: 28, width: 786, height: 539, fill: null, stroke: teal, strokeWidth: 1.5 }),
    createRect({ name: 'Inner frame', x: 38, y: 38, width: 766, height: 519, fill: null, stroke: '#D9A53A', strokeWidth: 0.75 }),
    createEllipse({ name: 'Corner top left', x: 33, y: 33, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner top right', x: 799, y: 33, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner bottom left', x: 33, y: 552, width: 10, height: 10, fill: solid(gold) }),
    createEllipse({ name: 'Corner bottom right', x: 799, y: 552, width: 10, height: 10, fill: solid(gold) }),
    T('Certificate of {{certificate_type}}', 74, { name: 'Title', fontFamily: 'Playfair Display', fontSize: 32, color: '#0F1A2B' }),
    L(261, 130, 140, gold, 1, { name: 'Divider left' }),
    createEllipse({ name: 'Divider dot', x: 416.5, y: 125.5, width: 9, height: 9, fill: solid(gold) }),
    L(441, 130, 140, gold, 1, { name: 'Divider right' }),
    T('is gratefully presented to', 150, { fontFamily: 'Cormorant Garamond', italic: true, fontSize: 24, color: '#5A6678' }),
    T('{{participant_name}}', 182, { fontFamily: 'Pinyon Script', fontSize: 76, color: teal }),
    L(211, 284, 420, gold, 1, { name: 'Name rule' }),
    T('in sincere appreciation of your contribution to\n{{event_name}}', 302, { name: 'Reason', fontFamily: 'Cormorant Garamond', fontSize: 23, color: '#2B3A52', lineHeight: 1.45 }),
    T('Issued by {{organization_name}}', 386, { name: 'Issuer line', fontFamily: 'Cormorant Garamond', italic: true, fontSize: 17, color: '#5A6678' }),
    ...sig(110, 502, 200, '{{issue_date}}', 'DATE', s),
    ...sig(532, 502, 200, '', 'SIGNATURE', s),
    createQr({ x: 386, y: 450, width: 70, fg: teal, bg: null }),
    certNumber(532, '#8791A1'),
  ]);
}

function achievementRibbon(): Design {
  const teal = '#0B6F69';
  const s: SigStyle = { ink: '#0F1A2B', line: '#CBD3DE', label: '#5A6678', font: 'Raleway' };
  return design(solid('#F3F5F8'), [
    createRect({ name: 'Card', x: 40, y: 40, width: 762, height: 515, fill: solid('#FFFFFF'), stroke: '#E0E5EC', strokeWidth: 1 }),
    T('{{organization_name}}', 76, { fontFamily: 'Raleway', bold: true, fontSize: 14, color: '#42516A', uppercase: true, letterSpacing: 5 }),
    createRect({ name: 'Ribbon top edge', x: 0, y: 114, width: W, height: 4, fill: solid('#C28A1B') }),
    createRect({ name: 'Ribbon', x: 0, y: 118, width: W, height: 66, fill: solid(teal) }),
    createRect({ name: 'Ribbon bottom edge', x: 0, y: 184, width: W, height: 4, fill: solid('#C28A1B') }),
    T('CERTIFICATE OF {{certificate_type}}', 118, { name: 'Title', x: 0, width: W, height: 66, valign: 'middle', fontFamily: 'Montserrat', bold: true, fontSize: 30, color: '#FFFFFF', letterSpacing: 5 }),
    T('This certificate is awarded to', 212, { fontFamily: 'Raleway', fontSize: 17, color: '#5A6678' }),
    T('{{participant_name}}', 238, { fontFamily: 'Playfair Display', bold: true, italic: true, fontSize: 54, color: '#0F1A2B' }),
    L(221, 314, 400, '#CBD3DE', 1.5, { name: 'Name rule' }),
    T('for outstanding contribution to', 328, { name: 'Reason', fontFamily: 'Raleway', fontSize: 16, color: '#42516A' }),
    T('{{event_name}}', 354, { fontFamily: 'Montserrat', bold: true, fontSize: 24, color: teal }),
    createEllipse({ name: 'Medal', x: 379, y: 424, width: 84, height: 84, fill: solid('#C28A1B'), stroke: '#9C6C10', strokeWidth: 2 }),
    createEllipse({ name: 'Medal ring', x: 389, y: 434, width: 64, height: 64, fill: null, stroke: '#FFFFFF', strokeWidth: 2 }),
    ...sig(90, 502, 200, '{{issue_date}}', 'DATE', s),
    ...sig(500, 502, 190, '', 'AUTHORISED SIGNATURE', s),
    createQr({ x: 712, y: 466, width: 64, fg: '#0F1A2B', bg: null }),
    certNumber(534, '#8791A1', { x: 300, width: 242 }),
  ]);
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: 'classic-gold', name: 'Classic Gold Frame', description: 'Cream paper, double gold frame, script name.', build: classicGold },
  { id: 'modern-teal', name: 'Modern Teal Band', description: 'Teal header band with a left-aligned layout.', build: modernTeal },
  { id: 'minimal-ink', name: 'Minimal Ink', description: 'Quiet serif name on plain paper.', build: minimalInk },
  { id: 'corporate-navy', name: 'Corporate Navy Sidebar', description: 'Navy sidebar holding the QR code.', build: corporateNavy },
  { id: 'academic-crest', name: 'Academic Crest', description: 'Navy border, gold crest and serif type.', build: academicCrest },
  { id: 'hackathon-bold', name: 'Hackathon Bold', description: 'Dark ground with oversized condensed type.', build: hackathonBold },
  { id: 'elegant-script', name: 'Elegant Script', description: 'Warm paper with a flowing script name.', build: elegantScript },
  { id: 'achievement-ribbon', name: 'Achievement Ribbon', description: 'Full-width teal ribbon and gold medal.', build: achievementRibbon },
];

export const DEFAULT_TEMPLATE_NAME = STARTER_TEMPLATES[0].name;
