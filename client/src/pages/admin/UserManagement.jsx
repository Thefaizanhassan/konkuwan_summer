import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

export default function UserManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/admin/users').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }) => apiClient.put(`/admin/users/${id}`, rest),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setModalOpen(false);
      setEditingUser(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/admin/users/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const roleLabel = (r) => (r ? t(`users.roles.${r}`, r.replace(/_/g, ' ')) : '—');

  const columns = [
    { header: t('common.name'), accessor: 'name' },
    { header: t('common.email'), accessor: 'email' },
    { header: t('users.role'), accessor: 'role', render: (_, row) => roleLabel(row.profile?.role || row.role) },
    {
      header: t('users.activeStatus'),
      accessor: 'is_active',
      render: (_, row) => (row.profile?.is_active ?? row.is_active)
        ? <span className="text-green-600 font-medium">{t('users.activeStatus')}</span>
        : <span className="text-red-500 font-medium">{t('users.inactive')}</span>,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">{t('users.adminUsers')}</h2>
        <Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>{t('users.inviteUser')}</Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row) => { setEditingUser(row); setModalOpen(true); }}
        actions={(row) => (
          <button
            onClick={(e) => { e.stopPropagation(); deactivateMutation.mutate(row.id); }}
            className="text-orange-600 text-sm hover:underline"
          >
            {(row.profile?.is_active ?? row.is_active) ? t('users.deactivate') : t('users.alreadyInactive')}
          </button>
        )}
      />

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setModalOpen(false); setEditingUser(null); }}
          onSubmit={(formData) => {
            if (editingUser) {
              updateMutation.mutate({ id: editingUser.id, ...formData });
            } else {
              apiClient
                .post('/admin/users/invite', { email: formData.email, role: formData.role })
                .then(() => {
                  queryClient.invalidateQueries(['admin-users']);
                  setModalOpen(false);
                })
                .catch(err => alert(err.response?.data?.message || t('users.inviteFailed')));
            }
          }}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSubmit, isLoading }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.profile?.role || user?.role || 'viewer',
    is_active: user?.profile?.is_active ?? user?.is_active ?? true,
  });

  const ROLES = ['super_admin', 'product_manager', 'order_manager', 'farm_manager', 'viewer'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">
          {user ? t('users.editUser') : t('users.inviteNew')}
        </h3>

        {user && (
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.name')}</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-border p-2 rounded-sm text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">
            {t('common.email')} {!user && '*'}
          </label>
          <input
            type="email"
            required={!user}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border border-border p-2 rounded-sm text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('users.role')}</label>
          <select
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full border border-border p-2 rounded-sm text-sm"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{t(`users.roles.${r}`, r.replace(/_/g, ' '))}</option>
            ))}
          </select>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
            />
            <label htmlFor="is_active" className="text-sm">{t('users.activeStatus')}</label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving') : user ? t('users.saveChanges') : t('users.sendInvite')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* #initial code
    import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/admin/users').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }) => apiClient.put(`/admin/users/${id}`, rest),
    onSuccess: () => { queryClient.invalidateQueries(['admin-users']); setModalOpen(false); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/admin/users/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Active', accessor: 'is_active', render: v => v ? '✅' : '❌' },
  ];

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">Admin Users</h2>
        <Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>Invite User</Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={handleEdit}
        actions={(row) => (
          row.id !== 'current-user-id' && ( // protect self-deactivate
            <button onClick={() => deactivateMutation.mutate(row.id)} className="text-orange-600 text-sm">Toggle Active</button>
          )
        )}
      />
      {modalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setModalOpen(false)}
          onSubmit={(formData) => {
            if (editingUser) {
              updateMutation.mutate({ id: editingUser.id, ...formData });
            } else {
                apiClient
                    .post('/admin/users/invite', { email: formData.email, role: formData.role })
                    .then(() => {
                        queryClient.invalidateQueries(['admin-users']);
                        setModalOpen(false);
                    })
                    .catch(err => {
                        alert(err.response?.data?.message || 'Failed to send invitation');
                    });
              // invite logic
            //   apiClient.post('/admin/users/invite', { email: formData.email, role: formData.role })
            //     .then(() => queryClient.invalidateQueries(['admin-users']))
            //     .finally(() => setModalOpen(false));
            }
          }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    is_active: user?.is_active ?? true,
  });
  // ... form fields similar to CustomerForm but with role select and active checkbox.
  // Invite mode hides name/password; edit mode shows them.
}
*/