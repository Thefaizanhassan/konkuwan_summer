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
              // invite logic
              apiClient.post('/admin/users/invite', { email: formData.email, role: formData.role })
                .then(() => queryClient.invalidateQueries(['admin-users']))
                .finally(() => setModalOpen(false));
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