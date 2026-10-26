import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Search, Layers, FileBadge2, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { EmptyState, Modal, PageHeader, Skeleton, StatusStamp } from '../components/ui';

function parseDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(`${v}`.length <= 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const Events: React.FC = () => {
  const { activeOrg } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState('');

  const fetchEvents = async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/events?organizationId=${activeOrg.organizationId}`);
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeOrg]);

  const openModal = () => {
    setFormError('');
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeOrg) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.post('/events', {
        organizationId: activeOrg.organizationId,
        name: name.trim(),
        description: description.trim(),
        eventDate,
      });
      if (res.data.success) {
        setShowModal(false);
        setName('');
        setDescription('');
        fetchEvents();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'The event was not created. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? events.filter((e) => `${e.name} ${e.description || ''}`.toLowerCase().includes(q))
    : events;
  const totalCerts = events.reduce((n, e) => n + (e.certificateCount ?? 0), 0);
  const maxCerts = events.reduce((n, e) => Math.max(n, e.certificateCount ?? 0), 0);

  const newEventButton = (
    <button type="button" onClick={openModal} className="btn-primary">
      <Plus className="h-4 w-4" />
      New event
    </button>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Events"
        title="Events and programs"
        description="Each event holds its own template, batches and issued certificates."
        actions={newEventButton}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading events">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
          <span className="sr-only">Loading events</span>
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[13px] text-ink-500">
              <span className="num rounded-md border border-paper-200 bg-white px-2 py-0.5 text-[12px] font-semibold text-ink shadow-panel">{events.length}</span>
              {events.length === 1 ? 'event' : 'events'}
              <span className="text-ink-300" aria-hidden="true">·</span>
              <span className="num">{totalCerts.toLocaleString()}</span> certificates issued
            </div>
            {events.length > 3 && (
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="search"
                  aria-label="Filter events"
                  placeholder="Filter events"
                  className="input h-9 pl-9 text-[13px]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((event) => {
              const d = parseDate(event.eventDate);
              const certs = event.certificateCount ?? 0;
              const share = maxCerts > 0 ? Math.round((certs / maxCerts) * 100) : 0;
              return (
                <li key={event.id}>
                  <Link to={`/events/${event.id}`} className="card-link group flex h-full flex-col p-5" aria-label={`Open ${event.name}`}>
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-paper-200 bg-white text-center shadow-panel">
                        <span className="w-full bg-gradient-to-b from-seal-500 to-seal-600 py-[2px] font-mono text-[9px] font-medium uppercase tracking-wider text-white">
                          {d ? d.toLocaleString('en-GB', { month: 'short' }) : '---'}
                        </span>
                        <span className="font-display text-[18px] font-semibold leading-tight text-ink">{d ? d.getDate() : '-'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-display text-[15.5px] font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-seal-700">
                          {event.name}
                        </h3>
                        <p className="num mt-1 text-[11px] text-ink-400">{d ? d.getFullYear() : event.eventDate}</p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-seal-600" aria-hidden="true" />
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[13px] leading-relaxed text-ink-500">
                      {event.description || 'No description'}
                    </p>
                    <div className="mt-auto pt-4">
                      <div className="meter !h-1" title="Certificates compared with your busiest event" aria-hidden="true">
                        <span style={{ width: `${share}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <StatusStamp status={event.archived ? 'DRAFT' : 'ACTIVE'} label={event.archived ? 'Archived' : 'Active'} />
                        <div className="flex items-center gap-3 text-[12px] text-ink-500">
                          <span className="inline-flex items-center gap-1" title="Batches">
                            <Layers className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                            <span className="num font-semibold text-ink">{event.batchCount ?? 0}</span>
                            <span className="sr-only">batches</span>
                          </span>
                          <span className="inline-flex items-center gap-1" title="Certificates">
                            <FileBadge2 className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                            <span className="num font-semibold text-ink">{certs}</span>
                            <span className="sr-only">certificates</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={openModal}
                className="group flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed border-paper-300 bg-white/40 p-5 text-center transition-colors hover:border-seal-500/50 hover:bg-seal-50/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-seal-600 shadow-raise ring-1 ring-paper-200 transition-transform group-hover:scale-105">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-[13px] font-semibold text-ink-700">New event</span>
                <span className="text-[12px] text-ink-400">A hackathon, course or conference</span>
              </button>
            </li>
          </ul>
          {visible.length === 0 && (
            <div className="panel mt-4">
              <EmptyState title="No events match your filter" description="Try a different name, or clear the filter." icon={<Search className="h-5 w-5" />} />
            </div>
          )}
        </>
      ) : (
        <div className="panel">
          <EmptyState
            title="No events yet"
            description="Create your first hackathon, course or conference to start issuing certificates."
            icon={<CalendarDays className="h-5 w-5 text-seal-600" />}
            action={newEventButton}
          />
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create event"
        description="Set up an event for participant certificates."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" form="create-event-form" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating' : 'Create event'}
            </button>
          </>
        }
      >
        <form id="create-event-form" onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="alert-error" role="alert">{formError}</div>}
          <div>
            <label htmlFor="event-name" className="label">Event name</label>
            <input
              id="event-name"
              type="text"
              required
              placeholder="National Hackathon 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="event-date" className="label">Event date</label>
            <input
              id="event-date"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="event-description" className="label">Description (optional)</label>
            <textarea
              id="event-description"
              rows={3}
              placeholder="Who attended and what the event covered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input h-auto py-2"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
