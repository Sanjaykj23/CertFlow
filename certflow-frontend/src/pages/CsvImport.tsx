import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Upload,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Download,
  Plus
} from 'lucide-react';

export const CsvImport: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [batchName, setBatchName] = useState('Hackathon Participant Batch');
  const [file, setFile] = useState<File | null>(null);

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [launching, setLaunching] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get(`/events/${eventId}/templates`);
        if (res.data.success) {
          setTemplates(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedTemplateId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [eventId]);

  const downloadSampleCsv = () => {
    const csvContent =
      'participant_name,email,certificate_type\n' +
      'Arun Kumar,arun.kumar@example.com,Winner\n' +
      'Priya Sharma,priya.sharma@example.com,First Runner Up\n' +
      'Rahul Verma,rahul.verma@example.com,Finalist\n' +
      'Sneha Patel,sneha.patel@example.com,Participant\n' +
      'Vikram Singh,vikram.singh@example.com,Participant\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-participants.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setValidationResult(null);
    setValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await api.post(`/events/${eventId}/participants/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setValidationResult(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to parse CSV file');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmAndLaunch = async () => {
    if (!selectedTemplateId || !validationResult || !file) return;
    setLaunching(true);

    try {
      // Create Batch with all valid participants
      const validParticipants = validationResult.previewRows
        .filter((r: any) => r.valid)
        .map((r: any) => ({
          participantName: r.participantName,
          email: r.email,
          certificateType: r.certificateType,
        }));

      if (validParticipants.length === 0) {
        alert('No valid rows found in CSV to create batch.');
        return;
      }

      const createRes = await api.post(`/events/${eventId}/batches`, {
        name: batchName.trim(),
        templateId: selectedTemplateId,
        participants: validParticipants,
      });

      if (createRes.data.success) {
        const batchId = createRes.data.data.id;
        // Start Batch processing
        await api.post(`/batches/${batchId}/start`);
        navigate(`/batches/${batchId}/progress`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to launch certificate batch');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          to={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to event</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Certificate Batch</h1>
        <p className="text-xs text-slate-500">
          Upload participant CSV with names and emails for real-time certificate generation and delivery.
        </p>
      </div>

      {/* Warning if no templates exist */}
      {!loadingTemplates && templates.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-amber-800 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold">No Certificate Template Found</p>
              <p className="text-amber-700 mt-0.5">
                You must design or choose a certificate template before issuing certificates.
              </p>
            </div>
          </div>
          <Link
            to={`/events/${eventId}/templates/new`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 whitespace-nowrap shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template Now</span>
          </Link>
        </div>
      )}

      {/* Step 1: Batch Details & Template Selection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          1. Batch Details & Template
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Name</label>
            <input
              type="text"
              required
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Certificate Template</label>
              <Link
                to={`/events/${eventId}/templates/new`}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                + New Template
              </Link>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={templates.length === 0}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-100"
            >
              {templates.length === 0 ? (
                <option value="">No templates created yet</option>
              ) : (
                templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.orientation})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Upload CSV */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900">2. Participant CSV Import</h3>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center transition bg-slate-50/50">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            {file ? file.name : 'Choose a CSV file or drag and drop here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Accepts CSV columns: <code className="text-slate-600 font-mono">name</code> (or <code className="text-slate-600 font-mono">participant_name</code>), <code className="text-slate-600 font-mono">email</code>, <code className="text-slate-600 font-mono">certificate_type</code>
          </p>
          <label className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 cursor-pointer shadow-sm transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Select CSV File</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {validating && (
          <div className="p-4 bg-sky-50 text-sky-800 rounded-xl text-xs flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Validating rows, checking RFC 5322 emails, and detecting in-batch duplicates...</span>
          </div>
        )}
      </div>

      {/* Step 3: Validation Preview & Confirmation */}
      {validationResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">3. Validation Preview</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> {validationResult.validRows} Valid Rows
              </span>
              {validationResult.invalidRows > 0 && (
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <AlertCircle className="w-4 h-4" /> {validationResult.invalidRows} Errors / Duplicates
                </span>
              )}
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-96">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Participant Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Certificate Type</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validationResult.previewRows.map((r: any, idx: number) => (
                  <tr key={idx} className={r.valid ? 'hover:bg-slate-50/50' : 'bg-rose-50/40'}>
                    <td className="py-2 px-3 text-slate-400 font-mono">{r.rowIndex}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.participantName || '<empty>'}</td>
                    <td className="py-2 px-3 text-slate-600 font-mono">{r.email || '<empty>'}</td>
                    <td className="py-2 px-3 text-slate-700">{r.certificateType}</td>
                    <td className="py-2 px-3">
                      {r.valid ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                          Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[10px]">
                          {r.errorMessage}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Ready to generate {validationResult.validRows} personalized certificates with live verification tokens
            </span>
            <button
              onClick={handleConfirmAndLaunch}
              disabled={launching || validationResult.validRows === 0 || !selectedTemplateId}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-600 to-sky-500 text-white text-xs font-semibold rounded-xl hover:from-brand-500 hover:to-sky-400 shadow-md shadow-brand-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{launching ? 'Queueing Batch...' : `Confirm & Launch Batch (${validationResult.validRows} Certificates)`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
