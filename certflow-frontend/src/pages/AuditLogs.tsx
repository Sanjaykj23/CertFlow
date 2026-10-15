import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, PageLoading, formatWhen } from '../components/ui';

export const AuditLogs: React.FC = () => {
  const { activeOrg } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!activeOrg) return;
      try {
        const res = await api.get(`/organizations/${activeOrg.organizationId}/audit-logs?size=100`);
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [activeOrg]);

  const actorOf = (l: any): string =>
    l.actorName || l.actorEmail || l.userEmail || l.userName || l.actor || l.userId || '-';
  const targetOf = (l: any): string =>
    [l.resourceType, l.resourceId].filter(Boolean).join(' ') || '-';

  const q = filter.trim().toLowerCase();
  const shown = q
    ? logs.filter((l) =>
        [l.action, actorOf(l), targetOf(l), l.detailsJson].some((v) => String(v ?? '').toLowerCase().includes(q))
      )
    : logs;

  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="A record of sensitive actions in this organization: batch launches, revocations and replacements. Showing the latest 100."
      />

      <section className="panel mb-5">
        <div className="panel-body">
          <label htmlFor="audit-filter" className="label">Filter</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="audit-filter"
              type="search"
              className="input pl-9"
              placeholder="Action, actor, target or details"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {loading ? (
          <PageLoading label="Loading audit log" />
        ) : shown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ledger w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap font-mono text-[12px] text-ink-500">{formatWhen(log.createdAt)}</td>
                    <td className="text-ink-700">{actorOf(log)}</td>
                    <td>
                      <StatusStamp status={log.action} tone="seal" dot={false} />
                    </td>
                    <td className="font-mono text-[12px] text-ink-600">{targetOf(log)}</td>
                    <td className="max-w-md truncate font-mono text-[11px] text-ink-500" title={log.detailsJson || ''}>
                      {log.detailsJson || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={logs.length === 0 ? 'No audit records yet' : 'No records match your filter'}
            description={
              logs.length === 0
                ? 'Revoking or replacing a certificate, or launching a batch, adds a record here.'
                : 'Clear the filter to see all 100 recent records.'
            }
          />
        )}
      </section>
    </div>
  );
};
