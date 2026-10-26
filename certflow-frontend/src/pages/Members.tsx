import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Crown, ShieldCheck, Wrench, Eye, Users } from 'lucide-react';
import { PageHeader, StatusStamp, EmptyState, Modal, Avatar, formatWhen } from '../components/ui';

const LADDER = [
  { role: 'OWNER', text: 'Runs the workspace: team, events, templates, batches and revocations.' },
  { role: 'ADMIN', text: 'Manages events, templates, batches and revocations. Cannot change owners.' },
  { role: 'OPERATOR', text: 'Creates batches, retries deliveries and watches pipelines.' },
  { role: 'VIEWER', text: 'Reads certificates and batch reports. Cannot change anything.' },
];

const LADDER_ICONS = [Crown, ShieldCheck, Wrench, Eye];

export const Members: React.FC = () => {
  const { activeOrg } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchMembers = async () => {
    if (!activeOrg) return;
    try {
      const res = await api.get(`/organizations/${activeOrg.organizationId}/members`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setMembers(res.data.data);
      }
    } catch {
      setMembers([
        {
          id: '1',
          name: 'Organizer',
          email: 'admin@certflow.io',
          role: activeOrg?.role || 'OWNER',
          joinedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrg]);

  const closeModal = () => {
    setShowAddModal(false);
    setError('');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !activeOrg) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/organizations/${activeOrg.organizationId}/members`, {
        email: email.trim(),
        role,
      });
      setNotice(`${email.trim()} was added as ${role}.`);
      setShowAddModal(false);
      setEmail('');
      fetchMembers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'The member was not added. Check that the email belongs to a registered CertFlow user and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Members"
        description="Everyone with access to this organization, and what each role is allowed to do."
        actions={
          <button type="button" className="btn-primary" onClick={() => { setNotice(''); setShowAddModal(true); }}>
            <UserPlus className="h-4 w-4" /> Add member
          </button>
        }
      />

      {notice && <div className="alert-ok mb-4" role="status">{notice}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="panel self-start overflow-hidden">
          <div className="panel-head">
            <h2 className="panel-title">Team</h2>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
              <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
              <span className="num font-semibold text-ink">{members.length}</span> {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="ledger w-full">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name || m.email} className="!h-9 !w-9" />
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{m.name}</p>
                            <p className="truncate font-mono text-[11px] text-ink-500">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusStamp status={m.role} />
                      </td>
                      <td className="whitespace-nowrap font-mono text-[12px] text-ink-500">{formatWhen(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No members yet" description="Add a teammate by email to share access to this organization." />
          )}
        </section>

        <aside className="panel self-start">
          <div className="panel-head">
            <h2 className="panel-title">Role ladder</h2>
          </div>
          <div className="panel-body">
            <p className="mb-3 text-[13px] leading-relaxed text-ink-600">
              Each role can do everything the roles below it can do.
            </p>
            <ol className="relative space-y-4">
              <span className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-foil-400/60 via-seal-200 to-paper-200" aria-hidden="true" />
              {LADDER.map((l, i) => {
                const Icon = LADDER_ICONS[i];
                return (
                  <li key={l.role} className="relative flex gap-3">
                    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-500 shadow-panel ring-1 ring-paper-200" aria-hidden="true">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="pt-1">
                      <StatusStamp status={l.role} />
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{l.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <Modal
        open={showAddModal}
        onClose={closeModal}
        title="Add member"
        description="The person needs a CertFlow account with this email address."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="add-member-form" className="btn-primary" disabled={loading}>
              {loading ? 'Adding' : 'Add member'}
            </button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={handleAddMember} className="space-y-4">
          {error && <div className="alert-error" role="alert">{error}</div>}
          <div>
            <label htmlFor="member-email" className="label">Email</label>
            <input
              id="member-email"
              type="email"
              required
              className="input"
              placeholder="colleague@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="member-role" className="label">Role</label>
            <select id="member-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="ADMIN">ADMIN: manages events, templates and batches</option>
              <option value="OPERATOR">OPERATOR: issues batches and retries emails</option>
              <option value="VIEWER">VIEWER: read-only</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
