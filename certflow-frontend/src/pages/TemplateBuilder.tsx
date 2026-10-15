import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Braces, Layers, LayoutTemplate, Palette, PanelRight, Shapes, TriangleAlert, Upload } from 'lucide-react';
import api from '../api/client';
import { ensureDesign, layoutConfigFromDesign } from '../lib/designer';
import type { Design } from '../lib/designer';
import { SAMPLE_VALUES } from '../lib/certificate';
import { ensureFontsLoaded } from '../lib/fonts';
import { Spinner } from '../components/ui';
import { DesignerStage } from '../components/designer/DesignerStage';
import { useDesigner } from '../components/designer/store';
import { TopBar } from '../components/designer/TopBar';
import { ContextToolbar } from '../components/designer/ContextToolbar';
import { Inspector } from '../components/designer/Inspector';
import { TemplatesPanel } from '../components/designer/TemplatesPanel';
import { ElementsPanel } from '../components/designer/ElementsPanel';
import { FieldsPanel } from '../components/designer/FieldsPanel';
import { UploadsPanel } from '../components/designer/UploadsPanel';
import { BackgroundPanel } from '../components/designer/BackgroundPanel';
import { LayersPanel } from '../components/designer/LayersPanel';
import { DEFAULT_TEMPLATE_NAME, STARTER_TEMPLATES } from '../components/designer/StarterTemplates';
import type { LoadedImage } from '../components/designer/imageFiles';
import { cx, useMedia } from '../components/designer/controls';

type Tab = 'templates' | 'elements' | 'fields' | 'uploads' | 'background' | 'layers';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'fields', label: 'Fields', icon: Braces },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'background', label: 'Background', icon: Palette },
  { id: 'layers', label: 'Layers', icon: Layers },
];

interface StoredTemplate {
  id?: string | number;
  name?: string;
  createdAt?: string;
  layoutConfig?: unknown;
}

function parseLayout(raw: unknown): Parameters<typeof ensureDesign>[0] {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return (raw as Parameters<typeof ensureDesign>[0]) ?? null;
}

export const TemplateBuilder: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const [initial] = useState<Design>(() => STARTER_TEMPLATES[0].build());
  const designer = useDesigner(initial);

  const [name, setName] = useState(DEFAULT_TEMPLATE_NAME);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('templates');
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [uploads, setUploads] = useState<LoadedImage[]>([]);

  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [effectiveZoom, setEffectiveZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [preview, setPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveWarning, setLeaveWarning] = useState(false);

  const narrow = useMedia('(max-width: 799px)');
  const mid = useMedia('(max-width: 1099px)');

  /* ----- dirty tracking ----- */
  const [baseline, setBaseline] = useState<Design | null>(null);
  const [baselineName, setBaselineName] = useState(DEFAULT_TEMPLATE_NAME);
  const awaitingBaseline = useRef(true);
  useEffect(() => {
    if (awaitingBaseline.current) {
      awaitingBaseline.current = false;
      setBaseline(designer.design);
    }
  }, [designer.design]);
  const dirty = !loading && baseline !== null && (designer.design !== baseline || name !== baselineName);

  /* ----- fit the editor to the viewport below the nav ----- */
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(640);
  useLayoutEffect(() => {
    const measure = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 56;
      const scrollTop = window.scrollY || 0;
      setHeight(Math.max(480, window.innerHeight - (top + scrollTop) - 24));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* ----- fonts ----- */
  useEffect(() => {
    void ensureFontsLoaded();
  }, []);

  /* ----- panel defaults follow the viewport ----- */
  useEffect(() => {
    setInspectorOpen(!mid);
  }, [mid]);
  useEffect(() => {
    if (!narrow) setSheetOpen(false);
  }, [narrow]);

  /* ----- load the event's latest template ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/events/${eventId}/templates`);
        const list: StoredTemplate[] = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
        const wanted = search.get('templateId');
        let pick: StoredTemplate | undefined = wanted ? list.find((t) => String(t.id) === wanted) : undefined;
        if (!pick && list.length > 0) {
          pick = [...list].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))).pop();
        }
        if (!cancelled && pick?.layoutConfig) {
          const loaded = ensureDesign(parseLayout(pick.layoutConfig));
          awaitingBaseline.current = true;
          designer.load(loaded);
          if (pick.name) {
            setName(pick.name);
            setBaselineName(pick.name);
          }
        }
      } catch {
        // The editor still works with a starter design when the list cannot be fetched.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /* ----- warn before closing the tab with unsaved work ----- */
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  /* ----- save ----- */
  const save = useCallback(async (): Promise<boolean> => {
    if (saving) return false;
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError('Name the template before saving.');
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const design = designer.design;
      const layoutConfig = layoutConfigFromDesign(design);
      const templateData = {
        name: trimmed,
        orientation: layoutConfig.orientation,
        width: design.width,
        height: design.height,
        layoutConfig,
      };
      const formData = new FormData();
      formData.append('template', new Blob([JSON.stringify(templateData)], { type: 'application/json' }));
      const res = await api.post(`/events/${eventId}/templates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        setBaseline(design);
        setBaselineName(trimmed);
        navigate(`/events/${eventId}`);
        return true;
      }
      setSaveError(res.data?.message || 'The template could not be saved. Try again.');
      return false;
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'The template could not be saved. Check your connection and try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [saving, name, designer.design, eventId, navigate]);

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const onBack = (e: React.MouseEvent) => {
    if (dirty) {
      e.preventDefault();
      setLeaveWarning(true);
    }
  };

  /* ----- left panel content ----- */
  const panel = (
    <>
      {tab === 'templates' && (
        <TemplatesPanel
          designer={designer}
          onApplied={(t) => {
            if (!name.trim() || STARTER_TEMPLATES.some((s) => s.name === name)) setName(t.name);
          }}
        />
      )}
      {tab === 'elements' && <ElementsPanel designer={designer} />}
      {tab === 'fields' && <FieldsPanel designer={designer} />}
      {tab === 'uploads' && <UploadsPanel designer={designer} uploads={uploads} onUploads={setUploads} />}
      {tab === 'background' && <BackgroundPanel designer={designer} />}
      {tab === 'layers' && <LayersPanel designer={designer} />}
    </>
  );

  const tabButtons = (horizontal: boolean) => (
    <div
      role="tablist"
      aria-label="Design panels"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      className={horizontal ? 'flex overflow-x-auto border-b border-paper-200 bg-paper-50' : 'flex flex-col gap-0.5 p-1.5'}
    >
      {TABS.map((t) => {
        const active = tab === t.id && (horizontal || panelOpen);
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={t.label}
            title={t.label}
            onClick={() => {
              if (!horizontal && tab === t.id) setPanelOpen((o) => !o);
              else {
                setTab(t.id);
                setPanelOpen(true);
              }
            }}
            className={cx(
              'flex shrink-0 flex-col items-center justify-center gap-1 rounded-md text-[10.5px] font-medium transition-colors',
              horizontal ? 'h-12 min-w-[64px] flex-1 px-2' : 'h-[54px] w-full',
              active ? 'bg-seal-50 text-seal-800' : 'text-ink-500 hover:bg-paper-100 hover:text-ink',
            )}
          >
            <t.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const inspector = (
    <Inspector
      designer={designer}
      onClose={() => setInspectorOpen(false)}
      onOpenBackground={() => {
        setTab('background');
        setPanelOpen(true);
        if (narrow) setSheetOpen(true);
      }}
    />
  );

  const count = designer.selection.length;

  return (
    <div
      ref={rootRef}
      style={{ height }}
      className="relative flex min-h-0 flex-col overflow-hidden rounded-panel border border-paper-200 bg-white shadow-panel"
    >
      <TopBar
        designer={designer}
        eventId={eventId ?? ''}
        name={name}
        onName={setName}
        onBack={onBack}
        showGrid={showGrid}
        onGrid={setShowGrid}
        snap={snap}
        onSnap={setSnap}
        zoom={zoom}
        effectiveZoom={effectiveZoom}
        onZoom={setZoom}
        preview={preview}
        onPreview={(v) => {
          setPreview(v);
          if (v) designer.clearSelection();
        }}
        saving={saving}
        dirty={dirty}
        onSave={() => void save()}
        saveError={saveError}
        narrow={narrow}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((o) => !o)}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((o) => !o)}
      />

      {leaveWarning && (
        <div role="alert" className="alert-warn mx-3 mt-2 flex-wrap items-center !py-2">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">You have unsaved changes. Leave without saving them?</span>
          <span className="flex shrink-0 gap-2">
            <button type="button" className="btn-primary btn-sm" disabled={saving} onClick={() => void save()}>
              Save and leave
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/events/${eventId}`)}>
              Leave
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setLeaveWarning(false)}>
              Stay
            </button>
          </span>
        </div>
      )}

      {!preview && <ContextToolbar designer={designer} />}

      <div className="relative flex min-h-0 flex-1">
        {!narrow && (
          <>
            <nav aria-label="Design tools" className="w-[66px] shrink-0 border-r border-paper-200 bg-paper-50">
              {tabButtons(false)}
            </nav>
            {panelOpen && (
              <aside aria-label={`${tab} panel`} className="w-[300px] shrink-0 overflow-y-auto border-r border-paper-200 bg-white">
                {panel}
              </aside>
            )}
          </>
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-paper-100">
          <div className="relative min-h-0 flex-1">
            <DesignerStage
              designer={designer}
              values={SAMPLE_VALUES}
              zoom={zoom}
              onZoom={setZoom}
              onEffectiveZoom={setEffectiveZoom}
              showGrid={showGrid}
              snap={snap}
              preview={preview}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-paper-100/80">
                <Spinner label="Loading template" />
              </div>
            )}
          </div>
          <div className="flex h-7 shrink-0 items-center justify-between gap-3 border-t border-paper-200 bg-white px-3 text-[11.5px] text-ink-500">
            <span aria-live="polite">
              {preview
                ? 'Preview with sample values'
                : count === 0
                  ? `${designer.design.elements.length} elements`
                  : `${count} selected`}
            </span>
            <span className="num">{Math.round(effectiveZoom * 100)}%</span>
          </div>
        </div>

        {!mid && inspectorOpen && !preview && (
          <aside aria-label="Inspector" className="w-[280px] shrink-0 border-l border-paper-200 bg-white">
            {inspector}
          </aside>
        )}
        {mid && inspectorOpen && !preview && (
          <aside aria-label="Inspector" className="absolute inset-y-0 right-0 z-30 w-[min(300px,100%)] border-l border-paper-200 bg-white shadow-pop">
            {inspector}
          </aside>
        )}
        {!inspectorOpen && !mid && !preview && (
          <button
            type="button"
            className="btn-icon absolute right-2 top-2 z-20 border border-paper-200 bg-white shadow-panel"
            aria-label="Show inspector"
            title="Show inspector"
            onClick={() => setInspectorOpen(true)}
          >
            <PanelRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {narrow && sheetOpen && (
          <div
            role="region"
            aria-label="Design panels"
            className="absolute inset-x-0 bottom-0 z-30 flex h-[58%] flex-col border-t border-paper-300 bg-white shadow-pop"
          >
            {tabButtons(true)}
            <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
          </div>
        )}
      </div>
    </div>
  );
};
