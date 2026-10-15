import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Save, Upload, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { CertificateCanvas } from '../components/CertificateCanvas';
import { TextElement, SAMPLE_VALUES, resolveText } from '../lib/certificate';
import { isDemo } from '../lib/env';

const DESIGN_PRESETS: {
  id: string;
  name: string;
  description: string;
  badge: string;
  badgeClass: string;
  orientation: string;
  elements: TextElement[];
  qrCode: { enabled: boolean; x: number; y: number; size: number };
}[] = [
  {
    id: 'executive-gold',
    name: 'Executive Navy & Gold',
    description: 'Prestigious corporate recognition with serif typography and a navy and slate palette.',
    badge: 'Popular',
    badgeClass: 'stamp-seal',
    orientation: 'LANDSCAPE',
    elements: [
      {
        id: 'org-name',
        placeholder: '{{organization_name}}',
        x: 421,
        y: 85,
        fontSize: 16,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'cert-title',
        placeholder: 'CERTIFICATE OF EXCELLENCE',
        x: 421,
        y: 135,
        fontSize: 30,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'presented-to',
        placeholder: 'THIS IS PROUDLY PRESENTED TO',
        x: 421,
        y: 185,
        fontSize: 13,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'participant-name',
        placeholder: '{{participant_name}}',
        x: 421,
        y: 245,
        fontSize: 34,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#1E3A8A',
        alignment: 'CENTER',
      },
      {
        id: 'achievement',
        placeholder: 'for exemplary participation and dedication as {{certificate_type}} in',
        x: 421,
        y: 295,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#334155',
        alignment: 'CENTER',
      },
      {
        id: 'event-name',
        placeholder: '{{event_name}}',
        x: 421,
        y: 335,
        fontSize: 22,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'issue-date',
        placeholder: 'Issued on {{issue_date}}',
        x: 160,
        y: 475,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'cert-number',
        placeholder: 'ID: {{certificate_number}}',
        x: 160,
        y: 495,
        fontSize: 10,
        fontFamily: 'Courier',
        fontStyle: 'NORMAL',
        colorHex: '#94A3B8',
        alignment: 'CENTER',
      },
    ],
    qrCode: { enabled: true, x: 685, y: 430, size: 80 },
  },
  {
    id: 'tech-cyber',
    name: 'Tech & Hackathon Cyber',
    description: 'Modern developer theme featuring cyan highlights, monospace accents & high-contrast headers.',
    badge: 'Hackathon',
    badgeClass: 'stamp-info',
    orientation: 'LANDSCAPE',
    elements: [
      {
        id: 'org-name',
        placeholder: '{{organization_name}} // INNOVATION LABS',
        x: 421,
        y: 85,
        fontSize: 14,
        fontFamily: 'Courier',
        fontStyle: 'BOLD',
        colorHex: '#0284C7',
        alignment: 'CENTER',
      },
      {
        id: 'cert-title',
        placeholder: 'GLOBAL BUILDER RECOGNITION',
        x: 421,
        y: 135,
        fontSize: 28,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'presented-to',
        placeholder: 'VERIFIED CREDENTIAL AWARDED TO',
        x: 421,
        y: 185,
        fontSize: 12,
        fontFamily: 'Courier',
        fontStyle: 'NORMAL',
        colorHex: '#475569',
        alignment: 'CENTER',
      },
      {
        id: 'participant-name',
        placeholder: '{{participant_name}}',
        x: 421,
        y: 245,
        fontSize: 34,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#0284C7',
        alignment: 'CENTER',
      },
      {
        id: 'achievement',
        placeholder: 'for extraordinary engineering and building as {{certificate_type}} in',
        x: 421,
        y: 295,
        fontSize: 14,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#334155',
        alignment: 'CENTER',
      },
      {
        id: 'event-name',
        placeholder: '{{event_name}}',
        x: 421,
        y: 335,
        fontSize: 22,
        fontFamily: 'Courier',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'issue-date',
        placeholder: 'Certified: {{issue_date}}',
        x: 160,
        y: 475,
        fontSize: 11,
        fontFamily: 'Courier',
        fontStyle: 'NORMAL',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'cert-number',
        placeholder: 'Proof: {{certificate_number}}',
        x: 160,
        y: 495,
        fontSize: 10,
        fontFamily: 'Courier',
        fontStyle: 'BOLD',
        colorHex: '#0284C7',
        alignment: 'CENTER',
      },
    ],
    qrCode: { enabled: true, x: 685, y: 430, size: 80 },
  },
  {
    id: 'academic-honors',
    name: 'Academic & University Honors',
    description: 'Classic university diploma style with crimson headings and formal serif body text.',
    badge: 'Formal',
    badgeClass: 'stamp-bad',
    orientation: 'LANDSCAPE',
    elements: [
      {
        id: 'org-name',
        placeholder: '{{organization_name}}',
        x: 421,
        y: 85,
        fontSize: 18,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#1E293B',
        alignment: 'CENTER',
      },
      {
        id: 'cert-title',
        placeholder: 'DIPLOMA OF ACADEMIC MERIT',
        x: 421,
        y: 135,
        fontSize: 28,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#991B1B',
        alignment: 'CENTER',
      },
      {
        id: 'presented-to',
        placeholder: 'BE IT KNOWN TO ALL THAT BY THIS CHARTER CONFERRED UPON',
        x: 421,
        y: 185,
        fontSize: 11,
        fontFamily: 'Times-Roman',
        fontStyle: 'ITALIC',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'participant-name',
        placeholder: '{{participant_name}}',
        x: 421,
        y: 245,
        fontSize: 34,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'achievement',
        placeholder: 'having with high distinction completed all requirements as {{certificate_type}} for',
        x: 421,
        y: 295,
        fontSize: 13,
        fontFamily: 'Times-Roman',
        fontStyle: 'NORMAL',
        colorHex: '#334155',
        alignment: 'CENTER',
      },
      {
        id: 'event-name',
        placeholder: '{{event_name}}',
        x: 421,
        y: 335,
        fontSize: 22,
        fontFamily: 'Times-Roman',
        fontStyle: 'BOLD',
        colorHex: '#1E293B',
        alignment: 'CENTER',
      },
      {
        id: 'issue-date',
        placeholder: 'Conferred: {{issue_date}}',
        x: 160,
        y: 475,
        fontSize: 12,
        fontFamily: 'Times-Roman',
        fontStyle: 'NORMAL',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'cert-number',
        placeholder: 'Folio: {{certificate_number}}',
        x: 160,
        y: 495,
        fontSize: 10,
        fontFamily: 'Times-Roman',
        fontStyle: 'NORMAL',
        colorHex: '#94A3B8',
        alignment: 'CENTER',
      },
    ],
    qrCode: { enabled: true, x: 685, y: 430, size: 80 },
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimalist',
    description: 'Clean contemporary typography with crisp indigo accents and spacious margins.',
    badge: 'Modern',
    badgeClass: 'stamp-neutral',
    orientation: 'LANDSCAPE',
    elements: [
      {
        id: 'org-name',
        placeholder: '{{organization_name}}',
        x: 421,
        y: 90,
        fontSize: 15,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#6366F1',
        alignment: 'CENTER',
      },
      {
        id: 'cert-title',
        placeholder: 'CERTIFICATE OF ACHIEVEMENT',
        x: 421,
        y: 140,
        fontSize: 28,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'presented-to',
        placeholder: 'PROUDLY CONFERRED TO',
        x: 421,
        y: 190,
        fontSize: 12,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#64748B',
        alignment: 'CENTER',
      },
      {
        id: 'participant-name',
        placeholder: '{{participant_name}}',
        x: 421,
        y: 250,
        fontSize: 32,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#4F46E5',
        alignment: 'CENTER',
      },
      {
        id: 'achievement',
        placeholder: 'for participation as {{certificate_type}} in',
        x: 421,
        y: 300,
        fontSize: 13,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#475569',
        alignment: 'CENTER',
      },
      {
        id: 'event-name',
        placeholder: '{{event_name}}',
        x: 421,
        y: 340,
        fontSize: 20,
        fontFamily: 'Helvetica',
        fontStyle: 'BOLD',
        colorHex: '#0F172A',
        alignment: 'CENTER',
      },
      {
        id: 'issue-date',
        placeholder: 'Issued {{issue_date}}',
        x: 160,
        y: 475,
        fontSize: 11,
        fontFamily: 'Helvetica',
        fontStyle: 'NORMAL',
        colorHex: '#94A3B8',
        alignment: 'CENTER',
      },
    ],
    qrCode: { enabled: true, x: 685, y: 430, size: 80 },
  },
];

const PLACEHOLDERS: { token: string; note: string }[] = [
  { token: '{{participant_name}}', note: 'Recipient full name' },
  { token: '{{event_name}}', note: 'Event title' },
  { token: '{{organization_name}}', note: 'Issuing organisation' },
  { token: '{{certificate_type}}', note: 'Winner, Participant, Speaker' },
  { token: '{{issue_date}}', note: 'Date of issue' },
  { token: '{{certificate_number}}', note: 'Unique certificate ID' },
];

type Tab = 'presets' | 'text' | 'qr';
const TABS: { id: Tab; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'text', label: 'Text' },
  { id: 'qr', label: 'QR code' },
];

const num = (v: string, fallback: number) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const sizeFor = (o: string) => (o === 'LANDSCAPE' ? { w: 842, h: 595 } : { w: 595, h: 842 });

export const TemplateBuilder: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [activePreset, setActivePreset] = useState<string>('executive-gold');
  const [templateName, setTemplateName] = useState('Executive Certificate of Excellence');
  const [orientation, setOrientation] = useState('LANDSCAPE');
  const [width, setWidth] = useState(842);
  const [height, setHeight] = useState(595);

  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [elements, setElements] = useState<TextElement[]>(DESIGN_PRESETS[0].elements);
  const [qrCode, setQrCode] = useState(DESIGN_PRESETS[0].qrCode);

  const [tab, setTab] = useState<Tab>('presets');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const applyOrientation = (o: string) => {
    const s = sizeFor(o);
    setOrientation(o);
    setWidth(s.w);
    setHeight(s.h);
  };

  const applyPreset = (presetId: string) => {
    const p = DESIGN_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setActivePreset(presetId);
    setTemplateName(p.name);
    applyOrientation(p.orientation);
    setElements([...p.elements]);
    setQrCode({ ...p.qrCode });
    setSelectedId(null);
  };

  // Object URL for the chosen background, used by the on-stage preview.
  useEffect(() => {
    if (!bgFile) {
      setBgPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(bgFile);
    setBgPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bgFile]);

  const generatePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const payload = {
        layoutConfig: {
          orientation,
          width,
          height,
          textElements: elements,
          qrCode,
        },
        sampleParticipantName: 'Priya Sharma',
        sampleEventName: 'National AI Hackathon 2026',
        sampleOrganizationName: 'CertFlow Academy',
        sampleCertificateType: 'Winner',
      };

      const res = await api.post('/templates/preview', payload, {
        responseType: 'blob',
      });

      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPreviewPdfUrl(url);
    } catch (err) {
      console.error('Failed to generate preview', err);
      setPreviewError('The server preview failed. Edit the layout or refresh the preview to try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (isDemo) return;
    generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, qrCode, orientation]);

  const handleElementChange = (idx: number, field: keyof TextElement, val: any) => {
    const updated = [...elements];
    updated[idx] = { ...updated[idx], [field]: val };
    setElements(updated);
  };

  const addElement = () => {
    const newElem: TextElement = {
      id: `custom-${Date.now()}`,
      placeholder: 'Custom Text Element',
      x: 421,
      y: 400,
      fontSize: 14,
      fontFamily: 'Helvetica',
      fontStyle: 'NORMAL',
      colorHex: '#334155',
      alignment: 'CENTER',
    };
    setElements([...elements, newElem]);
    setSelectedId(newElem.id);
    setTab('text');
  };

  const removeElement = (idx: number) => {
    const updated = elements.filter((_, i) => i !== idx);
    setElements(updated);
    setSelectedId(null);
  };

  const selectedIdx = elements.findIndex((e) => e.id === selectedId);

  const insertPlaceholder = (token: string) => {
    if (selectedIdx < 0) return;
    const cur = elements[selectedIdx].placeholder;
    handleElementChange(selectedIdx, 'placeholder', cur ? `${cur} ${token}` : token);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const templateData = {
        name: templateName.trim(),
        orientation,
        width,
        height,
        layoutConfig: {
          orientation,
          width,
          height,
          textElements: elements,
          qrCode,
        },
      };

      const formData = new FormData();
      formData.append(
        'template',
        new Blob([JSON.stringify(templateData)], { type: 'application/json' })
      );
      if (bgFile) {
        formData.append('background', bgFile);
      }

      const res = await api.post(`/events/${eventId}/templates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        navigate(`/events/${eventId}`);
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'The template could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const stageMax = orientation === 'LANDSCAPE' ? 'max-w-[960px]' : 'max-w-[520px]';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-b border-paper-300 bg-white px-4 py-3 sm:px-6">
        <Link
          to={`/events/${eventId}`}
          className="btn-ghost btn-sm self-center"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to event</span>
        </Link>
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="tpl-name" className="eyebrow mb-1 block">Template name</label>
          <input
            id="tpl-name"
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="input w-full font-display text-base"
          />
        </div>
        <div className="flex items-center gap-3">
          {saving && (
            <span className="hint inline-flex items-center gap-1.5" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving template
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !templateName.trim()}
            className="btn-primary"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{saving ? 'Saving' : 'Save template'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="px-4 pt-3 sm:px-6">
          <div className="alert-error" role="alert">{saveError}</div>
        </div>
      )}

      {/* Studio */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Stage */}
        <section className="flex min-w-0 flex-col bg-paper-100" aria-label="Certificate stage">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-paper-300 bg-paper-50 px-4 py-3 sm:px-6">
            <div>
              <span className="eyebrow mb-1 block" id="orient-label">Orientation</span>
              <div className="inline-flex border border-paper-300" role="group" aria-labelledby="orient-label">
                {(['LANDSCAPE', 'PORTRAIT'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={orientation === o}
                    onClick={() => applyOrientation(o)}
                    className={`px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-seal-500 ${
                      orientation === o ? 'bg-ink text-white' : 'bg-white text-ink-600 hover:bg-paper-100'
                    }`}
                  >
                    {o === 'LANDSCAPE' ? 'Landscape' : 'Portrait'}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-[10rem] flex-1 basis-48 sm:max-w-xs">
              <label htmlFor="preset-select" className="eyebrow mb-1 block">Preset</label>
              <select
                id="preset-select"
                value={activePreset}
                onChange={(e) => applyPreset(e.target.value)}
                className="input w-full"
              >
                {DESIGN_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="eyebrow mb-1 block">Background</span>
              <div className="flex items-center gap-2">
                <label className="btn-secondary btn-sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-seal-500">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-[10rem] truncate">{bgFile ? bgFile.name : 'Upload image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload background image"
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) setBgFile(f);
                      e.target.value = '';
                    }}
                    className="sr-only"
                  />
                </label>
                {bgFile && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setBgFile(null)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            <p className="num ml-auto self-center text-xs text-ink-500">
              {width} x {height} pt
            </p>
          </div>

          <div
            className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8 lg:p-12"
            style={{
              backgroundImage: 'radial-gradient(rgba(15,26,43,0.07) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}
          >
            <div className={`w-full ${stageMax}`}>
              <div className="relative border border-paper-300 bg-white shadow-pop">
                {isDemo ? (
                  <CertificateCanvas
                    layout={{ orientation, width, height, textElements: elements, qrCode }}
                    backgroundUrl={bgPreviewUrl}
                  />
                ) : (
                  <div style={{ aspectRatio: `${width} / ${height}` }} className="relative w-full bg-white">
                    {previewPdfUrl ? (
                      <iframe
                        src={previewPdfUrl}
                        title="PDF Preview"
                        className="absolute inset-0 h-full w-full border-0 bg-white"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-ink-500">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Rendering preview</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Transparent hit-boxes: click a line of text to select it */}
                <div className="pointer-events-none absolute inset-0">
                  {elements.map((el) => {
                    const text = resolveText(el.placeholder, SAMPLE_VALUES);
                    const w = Math.max(24, text.length * el.fontSize * 0.55);
                    const h = el.fontSize * 1.3;
                    const left = el.alignment === 'LEFT' ? el.x : el.alignment === 'RIGHT' ? el.x - w : el.x - w / 2;
                    const isSel = el.id === selectedId;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        aria-label={`Select text: ${text}`}
                        aria-pressed={isSel}
                        onClick={() => {
                          setSelectedId(el.id);
                          setTab('text');
                        }}
                        className={`pointer-events-auto absolute bg-transparent hover:outline hover:outline-1 hover:outline-seal-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal-500 ${
                          isSel ? 'outline outline-2 outline-seal-500' : ''
                        }`}
                        style={{
                          left: `${(left / width) * 100}%`,
                          top: `${((el.y - el.fontSize) / height) * 100}%`,
                          width: `${(w / width) * 100}%`,
                          height: `${(h / height) * 100}%`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {!isDemo && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={generatePreview} disabled={previewLoading} className="btn-secondary btn-sm">
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    <span>{previewLoading ? 'Rendering' : 'Refresh preview'}</span>
                  </button>
                  <span className="hint">The server PDF does not show an uploaded background until you save.</span>
                </div>
              )}
              {previewError && <div className="alert-error mt-3" role="alert">{previewError}</div>}
            </div>
          </div>
        </section>

        {/* Inspector */}
        <aside className="min-w-0 border-t border-paper-300 bg-white lg:border-l lg:border-t-0 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto" aria-label="Inspector">
          <div className="sticky top-0 z-10 flex border-b border-paper-300 bg-white" role="tablist" aria-label="Inspector sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex-1 border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-seal-500 ${
                  tab === t.id ? 'border-seal-600 text-ink' : 'border-transparent text-ink-500 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'presets' && (
            <div id="panel-presets" role="tabpanel" aria-labelledby="tab-presets" className="p-4">
              <p className="hint mb-3">Choosing a preset replaces the text, colours and QR position.</p>
              <ul className="divide-y divide-paper-200 border-y border-paper-200">
                {DESIGN_PRESETS.map((p) => {
                  const isSelected = activePreset === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        aria-pressed={isSelected}
                        className={`block w-full px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-seal-500 ${
                          isSelected ? 'bg-seal-50' : 'hover:bg-paper-50'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-semibold text-ink">{p.name}</span>
                          <span className={p.badgeClass}>{isSelected ? 'Active' : p.badge}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-ink-500">{p.description}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === 'text' && (
            <div id="panel-text" role="tabpanel" aria-labelledby="tab-text" className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="eyebrow">Text elements <span className="num">({elements.length})</span></p>
                <button type="button" onClick={addElement} className="btn-secondary btn-sm">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add text</span>
                </button>
              </div>

              <ul className="divide-y divide-paper-200 border-y border-paper-200">
                {elements.map((elem, idx) => {
                  const open = elem.id === selectedId;
                  return (
                    <li key={elem.id || idx}>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`el-${idx}`}
                        onClick={() => setSelectedId(open ? null : elem.id)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-seal-500 ${
                          open ? 'bg-seal-50' : 'hover:bg-paper-50'
                        }`}
                      >
                        <span className="min-w-0 truncate text-sm text-ink">{elem.placeholder || 'Empty text'}</span>
                        <span className="num shrink-0 text-xs text-ink-500">{Math.round(elem.x)}, {Math.round(elem.y)}</span>
                      </button>

                      {open && (
                        <div id={`el-${idx}`} className="space-y-3 bg-paper-50 px-3 py-3">
                          <div>
                            <label htmlFor={`el-text-${idx}`} className="label">Text or placeholder</label>
                            <textarea
                              id={`el-text-${idx}`}
                              rows={2}
                              value={elem.placeholder}
                              onChange={(e) => handleElementChange(idx, 'placeholder', e.target.value)}
                              className="input w-full font-mono text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label htmlFor={`el-x-${idx}`} className="label">X (pt)</label>
                              <input
                                id={`el-x-${idx}`}
                                type="number"
                                value={elem.x}
                                onChange={(e) => handleElementChange(idx, 'x', num(e.target.value, 0))}
                                className="input w-full font-mono"
                              />
                            </div>
                            <div>
                              <label htmlFor={`el-y-${idx}`} className="label">Y (pt)</label>
                              <input
                                id={`el-y-${idx}`}
                                type="number"
                                value={elem.y}
                                onChange={(e) => handleElementChange(idx, 'y', num(e.target.value, 0))}
                                className="input w-full font-mono"
                              />
                            </div>
                            <div>
                              <label htmlFor={`el-size-${idx}`} className="label">Size</label>
                              <input
                                id={`el-size-${idx}`}
                                type="number"
                                min={1}
                                value={elem.fontSize}
                                onChange={(e) => handleElementChange(idx, 'fontSize', num(e.target.value, 12))}
                                className="input w-full font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor={`el-font-${idx}`} className="label">Font</label>
                              <select
                                id={`el-font-${idx}`}
                                value={elem.fontFamily}
                                onChange={(e) => handleElementChange(idx, 'fontFamily', e.target.value)}
                                className="input w-full"
                              >
                                <option value="Helvetica">Helvetica (Sans)</option>
                                <option value="Times-Roman">Times (Serif)</option>
                                <option value="Courier">Courier (Mono)</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`el-style-${idx}`} className="label">Style</label>
                              <select
                                id={`el-style-${idx}`}
                                value={elem.fontStyle}
                                onChange={(e) => handleElementChange(idx, 'fontStyle', e.target.value)}
                                className="input w-full"
                              >
                                <option value="BOLD">Bold</option>
                                <option value="NORMAL">Regular</option>
                                <option value="ITALIC">Italic</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`el-align-${idx}`} className="label">Alignment</label>
                              <select
                                id={`el-align-${idx}`}
                                value={elem.alignment}
                                onChange={(e) => handleElementChange(idx, 'alignment', e.target.value)}
                                className="input w-full"
                              >
                                <option value="CENTER">Center</option>
                                <option value="LEFT">Left</option>
                                <option value="RIGHT">Right</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`el-color-${idx}`} className="label">Colour</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  aria-label="Pick colour"
                                  value={/^#[0-9a-fA-F]{6}$/.test(elem.colorHex) ? elem.colorHex : '#000000'}
                                  onChange={(e) => handleElementChange(idx, 'colorHex', e.target.value.toUpperCase())}
                                  className="h-9 w-9 shrink-0 cursor-pointer border border-paper-300 bg-white p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-seal-500"
                                />
                                <input
                                  id={`el-color-${idx}`}
                                  type="text"
                                  value={elem.colorHex}
                                  onChange={(e) => handleElementChange(idx, 'colorHex', e.target.value)}
                                  className="input min-w-0 w-full font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <button type="button" onClick={() => removeElement(idx)} className="btn-danger-ghost btn-sm">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span>Delete element</span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6">
                <p className="eyebrow">Placeholders</p>
                <p className="hint mb-2">
                  {selectedIdx >= 0
                    ? 'Click a placeholder to add it to the selected element.'
                    : 'Select a text element to insert placeholders.'}
                </p>
                <ul className="divide-y divide-paper-200 border-y border-paper-200">
                  {PLACEHOLDERS.map((p) => (
                    <li key={p.token}>
                      <button
                        type="button"
                        disabled={selectedIdx < 0}
                        onClick={() => insertPlaceholder(p.token)}
                        className="flex w-full flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-left hover:bg-paper-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-seal-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <span className="font-mono text-xs text-seal-700">{p.token}</span>
                        <span className="text-xs text-ink-500">{p.note}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'qr' && (
            <div id="panel-qr" role="tabpanel" aria-labelledby="tab-qr" className="space-y-4 p-4">
              <label htmlFor="qr-enabled" className="flex cursor-pointer items-start gap-3">
                <input
                  id="qr-enabled"
                  type="checkbox"
                  checked={qrCode.enabled}
                  onChange={(e) => setQrCode({ ...qrCode, enabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 border-paper-300 text-seal-600 focus:ring-seal-500"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">Include verification QR code</span>
                  <span className="hint block">Recipients and employers scan it to confirm the certificate is genuine.</span>
                </span>
              </label>

              {qrCode.enabled && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="qr-x" className="label">X (pt)</label>
                    <input
                      id="qr-x"
                      type="number"
                      value={qrCode.x}
                      onChange={(e) => setQrCode({ ...qrCode, x: num(e.target.value, 0) })}
                      className="input w-full font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="qr-y" className="label">Y (pt)</label>
                    <input
                      id="qr-y"
                      type="number"
                      value={qrCode.y}
                      onChange={(e) => setQrCode({ ...qrCode, y: num(e.target.value, 0) })}
                      className="input w-full font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="qr-size" className="label">Size (pt)</label>
                    <input
                      id="qr-size"
                      type="number"
                      min={20}
                      value={qrCode.size}
                      onChange={(e) => setQrCode({ ...qrCode, size: num(e.target.value, 80) })}
                      className="input w-full font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
