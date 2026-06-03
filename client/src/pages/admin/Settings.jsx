import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api';
import Button from '../../components/ui/Button';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/admin/settings').then(r => r.data),
  });

  const [form, setForm] = useState({});

  useEffect(() => {
    if (data) setForm(data.data); // data is { key: value }
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: (settings) => apiClient.put('/admin/settings', { settings: Object.entries(settings).map(([key, value]) => ({ key, value })) }),
    onSuccess: () => queryClient.invalidateQueries(['settings']),
  });

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings.mutate(form);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="font-display text-3xl text-forest mb-6">System Settings</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-sm border border-border space-y-4 max-w-2xl">
        {Object.entries(form).map(([key, val]) => (
          <div key={key}>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{key.replace(/_/g, ' ')}</label>
            <input
              value={val}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full border p-2 rounded-sm"
            />
          </div>
        ))}
        <Button type="submit" disabled={updateSettings.isLoading}>Save Settings</Button>
      </form>
    </div>
  );
}