import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, Save, Eye, Upload, RefreshCw, Plus, Trash2, Palette, Sparkles, Check } from 'lucide-react';

interface TextElement {
  id: string;
  placeholder: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  colorHex: string;
  alignment: string;
}

const DESIGN_PRESETS: {
  id: string;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  orientation: string;
  elements: TextElement[];
  qrCode: { enabled: boolean; x: number; y: number; size: number };
}[] = [
  {
    id: 'executive-gold',
    name: 'Executive Navy & Gold',
    description: 'Prestigious corporate recognition with amber gold accents and serif typography.',
    badge: 'Popular',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
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
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
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
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
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
    description: 'Clean contemporary typography with crisp violet accents and spacious margins.',
    badge: 'Modern',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
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

export const TemplateBuilder: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [activePreset, setActivePreset] = useState<string>('executive-gold');
  const [templateName, setTemplateName] = useState('Executive Certificate of Excellence');
  const [orientation, setOrientation] = useState('LANDSCAPE');
  const [width, setWidth] = useState(842);
  const [height, setHeight] = useState(595);

  const [bgFile, setBgFile] = useState<File | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [elements, setElements] = useState<TextElement[]>(DESIGN_PRESETS[0].elements);
  const [qrCode, setQrCode] = useState(DESIGN_PRESETS[0].qrCode);

  const applyPreset = (presetId: string) => {
    const p = DESIGN_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setActivePreset(presetId);
    setTemplateName(p.name);
    setOrientation(p.orientation);
    if (p.orientation === 'LANDSCAPE') {
      setWidth(842);
      setHeight(595);
    } else {
      setWidth(595);
      setHeight(842);
    }
    setElements([...p.elements]);
    setQrCode({ ...p.qrCode });
  };

  const generatePreview = async () => {
    setPreviewLoading(true);
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
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    generatePreview();
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
  };

  const removeElement = (idx: number) => {
    const updated = elements.filter((_, i) => i !== idx);
    setElements(updated);
  };

  const handleSave = async () => {
    setSaving(true);
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
      alert(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to event</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Certificate Template Builder</h1>
          <p className="text-xs text-slate-500">
            Choose from professional design presets or build a custom certificate with real-time PDF Box preview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generatePreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
            <span>Update Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow-sm transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* Preset Designs Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Select Certificate Design Style</h3>
          </div>
          <span className="text-xs text-slate-400">Click a style to load layout & colors instantly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DESIGN_PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`relative p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50/40 shadow-sm ring-2 ring-brand-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{p.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{p.description}</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-600 pt-2 border-t border-slate-200/60">
                  <span>{p.orientation}</span>
                  {isSelected && (
                    <span className="text-brand-600 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration */}
        <div className="lg:col-span-5 space-y-5">
          {/* General Config Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Template Settings
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => {
                    const o = e.target.value;
                    setOrientation(o);
                    if (o === 'LANDSCAPE') {
                      setWidth(842);
                      setHeight(595);
                    } else {
                      setWidth(595);
                      setHeight(842);
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="LANDSCAPE">Landscape (A4)</option>
                  <option value="PORTRAIT">Portrait (A4)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Background</label>
                <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-brand-600" />
                  <span className="truncate">{bgFile ? bgFile.name : 'Upload image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setBgFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrCode.enabled}
                  onChange={(e) => setQrCode({ ...qrCode, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Include Live QR Verification Stamp</span>
              </label>
              {qrCode.enabled && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] text-slate-500">QR X (pt)</label>
                    <input
                      type="number"
                      value={qrCode.x}
                      onChange={(e) => setQrCode({ ...qrCode, x: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">QR Y (pt)</label>
                    <input
                      type="number"
                      value={qrCode.y}
                      onChange={(e) => setQrCode({ ...qrCode, y: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">QR Size</label>
                    <input
                      type="number"
                      value={qrCode.size}
                      onChange={(e) => setQrCode({ ...qrCode, size: parseFloat(e.target.value) || 80 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Elements Configuration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Text Elements & Coordinates ({elements.length})
              </h3>
              <button
                type="button"
                onClick={addElement}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Element</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {elements.map((elem, idx) => (
                <div key={elem.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={elem.placeholder}
                      onChange={(e) => handleElementChange(idx, 'placeholder', e.target.value)}
                      className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-medium"
                      placeholder="Text or {{placeholder}}"
                    />
                    <button
                      type="button"
                      onClick={() => removeElement(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 transition"
                      title="Delete element"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500">X (pt)</label>
                      <input
                        type="number"
                        value={elem.x}
                        onChange={(e) => handleElementChange(idx, 'x', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Y (pt)</label>
                      <input
                        type="number"
                        value={elem.y}
                        onChange={(e) => handleElementChange(idx, 'y', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Size</label>
                      <input
                        type="number"
                        value={elem.fontSize}
                        onChange={(e) => handleElementChange(idx, 'fontSize', parseFloat(e.target.value) || 12)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Color</label>
                      <input
                        type="text"
                        value={elem.colorHex}
                        onChange={(e) => handleElementChange(idx, 'colorHex', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/50">
                    <div>
                      <label className="block text-[10px] text-slate-500">Font</label>
                      <select
                        value={elem.fontFamily}
                        onChange={(e) => handleElementChange(idx, 'fontFamily', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                      >
                        <option value="Helvetica">Helvetica (Sans)</option>
                        <option value="Times-Roman">Times (Serif)</option>
                        <option value="Courier">Courier (Mono)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Style</label>
                      <select
                        value={elem.fontStyle}
                        onChange={(e) => handleElementChange(idx, 'fontStyle', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                      >
                        <option value="BOLD">Bold</option>
                        <option value="NORMAL">Regular</option>
                        <option value="ITALIC">Italic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Align</label>
                      <select
                        value={elem.alignment}
                        onChange={(e) => handleElementChange(idx, 'alignment', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                      >
                        <option value="CENTER">Center</option>
                        <option value="LEFT">Left</option>
                        <option value="RIGHT">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live PDF Preview */}
        <div className="lg:col-span-7">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[640px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-600" />
                Live PDF Box Preview (Real-time Render)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {width} x {height} pt • {orientation}
              </span>
            </div>

            <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2 relative">
              {previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  title="PDF Preview"
                  className="w-full h-full min-h-[560px] rounded-lg border-0 bg-white"
                />
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Rendering PDF preview...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
