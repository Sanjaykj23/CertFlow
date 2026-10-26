import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, ScrollText, UserRound } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, TableSkeleton, Avatar, formatWhen } from '../components/ui';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v: string) => ID_RE.test(v);
/** Shortens a UUID for display; the full value stays in the title attribute. */
const shortId = (v: string) => (isId(v) ? `${v.slice(0, 8)}…${v.slice(-4)}` : v);

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

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-paper-200/80 bg-gradient-to-b from-paper-50/80 to-white p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="w-full sm:max-w-md">
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
          {!loading && (
            <p className="text-[12px] text-ink-500">
              <span className="num font-semibold text-ink">{shown.length}</span>
              {shown.length !== logs.length && <span className="num"> of {logs.length}</span>} records
            </p>
          )}
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={5} label="Loading audit log" />
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
                    <td className="text-ink-700">
                      {isId(actorOf(log)) ? (
                        <span className="flex items-center gap-2.5 whitespace-nowrap" title={actorOf(log)}>
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-100 text-ink-400 ring-1 ring-paper-200" aria-hidden="true">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-mono text-[12px] text-ink-600">{shortId(actorOf(log))}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <Avatar name={actorOf(log)} size="sm" />
                          {actorOf(log)}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusStamp status={log.action} tone="seal" dot={false} />
                    </td>
                    <td className="whitespace-nowrap" title={targetOf(log)}>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-400">{log.resourceType || '-'}</span>
                      {log.resourceId && <span className="block font-mono text-[12px] text-ink-600">{shortId(String(log.resourceId))}</span>}
                    </td>
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
            icon={logs.length === 0 ? <ScrollText className="h-5 w-5" /> : <Search className="h-5 w-5" />}
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
