import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { EmptyState, Modal, PageHeader, PageLoading, StatusStamp } from '../components/ui';

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
        <PageLoading label="Loading events" />
      ) : events.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">All events</h2>
            <span className="eyebrow num">{events.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Batches</th>
                  <th className="text-right">Certificates</th>
                  <th><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="min-w-[200px]">
                      <Link to={`/events/${event.id}`} className="font-medium text-ink hover:text-seal-700">
                        {event.name}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-500">{event.description || 'No description'}</p>
                    </td>
                    <td className="num whitespace-nowrap text-[12px]">{event.eventDate}</td>
                    <td>
                      <StatusStamp status={event.archived ? 'DRAFT' : 'ACTIVE'} label={event.archived ? 'Archived' : 'Active'} />
                    </td>
                    <td className="num text-right">{event.batchCount ?? 0}</td>
                    <td className="num text-right">{event.certificateCount ?? 0}</td>
                    <td className="text-right">
                      <Link to={`/events/${event.id}`} className="btn-icon" aria-label={`Open ${event.name}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title="No events yet"
            description="Create your first hackathon, course or conference to start issuing certificates."
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
