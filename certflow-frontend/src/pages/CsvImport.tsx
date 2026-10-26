import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Upload, FileSpreadsheet, Play, Download, Plus, Sparkles, Check } from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui';

const SAMPLE_CSV =
  'participant_name,email,certificate_type\n' +
  'Arun Kumar,arun.kumar@example.com,Winner\n' +
  'Priya Sharma,priya.sharma@example.com,First Runner Up\n' +
  'Rahul Verma,rahul.verma@example.com,Finalist\n' +
  'Sneha Patel,sneha.patel@example.com,Participant\n' +
  'Vikram Singh,vikram.singh@example.com,Participant\n' +
  'Ananya Iyer,ananya.iyer@example.com,Finalist\n' +
  'Karthik Raman,karthik.raman@example.com,Participant\n' +
  'Divya Menon,divya.menon@example.com,Second Runner Up\n' +
  'Mohammed Faizan,faizan.m@example.com,Participant\n' +
  'Lakshmi Narayanan,lakshmi.n@example.com,Participant\n' +
  'Rohan Desai,rohan.desai#example.com,Participant\n' +
  'Priya Sharma,priya.sharma@example.com,Participant\n' +
  'Nikhil Reddy,nikhil.reddy@bounce.test,Participant\n' +
  'Meera Krishnan,meera.krishnan@example.com,Finalist\n';

const COLUMNS: { name: string; note: string; required: string }[] = [
  { name: 'participant_name', note: 'Full name printed on the certificate. "name" also works.', required: 'Yes' },
  { name: 'email', note: 'Delivery address for the PDF.', required: 'Yes' },
  { name: 'certificate_type', note: 'For example Winner or Participant.', required: 'Yes' },
];

const STEPS = ['Choose template and file', 'Review validation', 'Launch batch'];

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
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    try {
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
    } catch (err) {
      console.error(err);
      setError('Your browser blocked the download. Use "Use sample roster" to try the import without a file.');
    }
  };

  const processFile = async (uploadedFile: File) => {
    setError(null);
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
        const result = res.data.data;
        // A bad header row comes back as success with no rows and a single "header" error.
        const headerError = (result?.errors || []).find((e: any) => e?.field === 'header');
        if (headerError && !(result?.previewRows || []).length) {
          setError(headerError.message || 'The first row must hold the column names shown above.');
          return;
        }
        setValidationResult(result);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'The server could not read this CSV. Check that the first row holds the column names shown above, then choose the file again.'
      );
    } finally {
      setValidating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploadedFile = e.target.files[0];
    e.target.value = '';
    await processFile(uploadedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!dropped.name.toLowerCase().endsWith('.csv')) {
      setError('That file is not a CSV. Export your roster as .csv and drop it again.');
      return;
    }
    await processFile(dropped);
  };

  const useSampleRoster = async () => {
    const sample = new File([SAMPLE_CSV], 'sample-participants.csv', { type: 'text/csv' });
    await processFile(sample);
  };

  const handleConfirmAndLaunch = async () => {
    if (!selectedTemplateId || !validationResult || !file) return;
    setLaunching(true);
    setError(null);

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
        setError('No valid rows were found. Fix the errors in your CSV and import it again.');
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
      setError(
        err.response?.data?.message ||
          'The batch could not be launched. Check your connection and try again. Nothing was sent.'
      );
    } finally {
      setLaunching(false);
    }
  };

  const rows: any[] = validationResult?.previewRows || [];
  const duplicateCount = rows.filter((r) => !r.valid && /duplicate/i.test(r.errorMessage || '')).length;
  const currentStep = launching ? 3 : validationResult ? 2 : 1;
  const noTemplates = !loadingTemplates && templates.length === 0;

  const dropClass = dragging
    ? 'border-seal-500 bg-seal-50'
    : file
    ? 'border-seal-500/50 bg-paper-50'
    : 'border-paper-300 bg-paper-50 hover:border-seal-500';

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Issue certificates"
        title="Import participants"
        description="Choose a template, upload your roster, check every row, then launch the batch."
        back={{ to: `/events/${eventId}`, label: 'Back to event' }}
      />

      <ol className="panel mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:gap-0 sm:px-5" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < currentStep;
          const active = n === currentStep;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-b from-seal-500 to-seal-600 text-white shadow-glow'
                    : done
                    ? 'bg-seal-50 text-seal-700 ring-1 ring-seal-200'
                    : 'bg-white text-ink-400 ring-1 ring-paper-300'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">Step {n}</span>
                <span className={`block text-[13px] font-semibold ${active ? 'text-ink' : done ? 'text-seal-700' : 'text-ink-500'}`}>{label}</span>
              </span>
              {i < STEPS.length - 1 && (
                <span className={`mx-4 hidden h-px flex-1 sm:block ${done ? 'bg-seal-500' : 'bg-paper-300'}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="alert-error mb-5" role="alert">
          {error}
        </div>
      )}

      {noTemplates && (
        <div className="alert-warn mb-5 flex flex-wrap items-center justify-between gap-3">
          <p>This event has no certificate template. Create one before you issue certificates.</p>
          <Link to={`/events/${eventId}/templates/new`} className="btn-secondary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Create template
          </Link>
        </div>
      )}

      <section className="panel mb-6">
        <div className="panel-head">
          <h2 className="panel-title">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-seal-50 align-[2px] font-mono text-[11px] text-seal-700">1</span> Choose template and file
          </h2>
          <button type="button" onClick={downloadSampleCsv} className="btn-ghost btn-sm">
            <Download className="h-3.5 w-3.5" />
            Download sample CSV
          </button>
        </div>
        <div className="panel-body space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="batch-name" className="label">Batch name</label>
              <input
                id="batch-name"
                type="text"
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="template" className="label">Certificate template</label>
                <Link to={`/events/${eventId}/templates/new`} className="hint text-seal-700 hover:underline">
                  New template
                </Link>
              </div>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={templates.length === 0}
                className="input"
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center overflow-hidden rounded-panel border-2 border-dashed px-5 py-10 text-center transition-all duration-200 ${dropClass}`}
              >
                <span className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" aria-hidden="true" />
                <span
                  className={`relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-raise ring-1 transition-transform duration-200 ${
                    dragging ? 'scale-110 ring-seal-200' : 'ring-paper-200'
                  }`}
                >
                  <FileSpreadsheet className={`h-7 w-7 ${file || dragging ? 'text-seal-600' : 'text-ink-400'}`} strokeWidth={1.5} />
                </span>
                <p className="relative text-[14px] font-semibold text-ink">
                  {dragging ? 'Drop the CSV to upload it' : file ? file.name : 'Drag a CSV here'}
                </p>
                <p className="hint relative mt-1">
                  {file && !dragging
                    ? `${(file.size / 1024).toFixed(1)} KB. Choose another file to replace it.`
                    : 'Only .csv files are accepted.'}
                </p>
                <div className="relative mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Select CSV file
                  </button>
                  <button type="button" className="btn-secondary" onClick={useSampleRoster} disabled={validating}>
                    <Sparkles className="h-4 w-4" />
                    Use sample roster
                  </button>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                  aria-label="Participant CSV file"
                  tabIndex={-1}
                />
              </div>
              {validating && (
                <div className="alert-info mt-4" role="status">
                  <Spinner label="Checking emails, required fields, and duplicates in this file" />
                </div>
              )}
            </div>

            <div>
              <p className="eyebrow mb-2">Required columns</p>
              <div className="overflow-x-auto">
                <table className="ledger w-full text-left">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COLUMNS.map((c) => (
                      <tr key={c.name}>
                        <td className="font-mono text-[12px]" title={c.note}>{c.name}</td>
                        <td className="font-mono text-[12px]">{c.required}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint mt-2">Put these names in the first row. "name" also works for participant_name.</p>
            </div>
          </div>
        </div>
      </section>

      {validationResult && (
        <section className="panel mb-6">
          <div className="panel-head">
            <h2 className="panel-title">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-seal-50 align-[2px] font-mono text-[11px] text-seal-700">2</span> Review validation
            </h2>
          </div>
          <div className="panel-body space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: 'Total rows', v: validationResult.totalRows ?? rows.length, c: 'text-ink' },
                { k: 'Valid', v: validationResult.validRows, c: 'text-ok-700' },
                { k: 'Invalid', v: validationResult.invalidRows, c: validationResult.invalidRows > 0 ? 'text-bad-700' : 'text-ink' },
                { k: 'Duplicates', v: duplicateCount, c: duplicateCount > 0 ? 'text-warn-700' : 'text-ink' },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-paper-200 bg-paper-50/60 px-4 py-3">
                  <dt className="eyebrow">{s.k}</dt>
                  <dd className={`mt-1.5 font-display text-[26px] font-semibold leading-none tracking-tight ${s.c}`}>{s.v}</dd>
                </div>
              ))}
            </dl>

            {validationResult.invalidRows > 0 && (
              <p className="hint">Only valid rows are issued. Rows marked below are skipped.</p>
            )}

            <div className="max-h-96 overflow-auto rounded-lg border border-paper-200">
              <table className="ledger w-full min-w-[560px] text-left">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Participant</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, idx: number) => (
                    <tr key={idx} className={r.valid ? '' : 'bg-bad-50/60'}>
                      <td className="font-mono text-[12px] text-ink-400">{r.rowIndex}</td>
                      <td className="font-semibold text-ink">{r.participantName || <span className="text-ink-400">Empty</span>}</td>
                      <td className="font-mono text-[12px] break-all">{r.email || <span className="text-ink-400">Empty</span>}</td>
                      <td>{r.certificateType}</td>
                      <td>
                        {r.valid ? (
                          <span className="stamp-ok">Ready</span>
                        ) : (
                          <span className="stamp-bad whitespace-normal">{r.errorMessage || 'Invalid row'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {validationResult && (
        <section className="panel relative overflow-hidden border-seal-200">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-seal-500 via-seal-200 to-foil-400" aria-hidden="true" />
          <div className="panel-head">
            <h2 className="panel-title">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-seal-50 align-[2px] font-mono text-[11px] text-seal-700">3</span> Launch batch
            </h2>
          </div>
          <div className="panel-body flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-ink-600">
              <span className="font-mono font-semibold text-ink">{validationResult.validRows}</span> certificates will be
              generated and emailed, each with a live verification link.
            </p>
            <button
              type="button"
              onClick={handleConfirmAndLaunch}
              disabled={launching || validationResult.validRows === 0 || !selectedTemplateId}
              className="btn-primary"
            >
              <Play className="h-4 w-4" />
              {launching ? 'Queueing batch' : `Launch batch (${validationResult.validRows})`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
