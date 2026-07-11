import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function WarRoom() {
  const queryClient = useQueryClient();
  const [weekRef, setWeekRef] = useState('');
  const [brief, setBrief] = useState(null);

  const generateBrief = useMutation({
    mutationFn: () => apiClient.post('/admin/farm/warroom-brief', { week_ref: weekRef }).then(r => r.data.data),
    onSuccess: (data) => {
      setBrief(data.brief_json);
      // The brief is stored in war_room_briefs — refresh the saved list below
      queryClient.invalidateQueries({ queryKey: ['warroom-briefs'] });
    },
    onError: (err) => alert(err?.response?.data?.message || 'Brief generation failed.'),
  });

  const { data: pastBriefs } = useQuery({
    queryKey: ['warroom-briefs'],
    queryFn: () => apiClient.get('/admin/farm/warroom-briefs').then(r => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-display text-lg mb-3">Monday War Room Brief</h3>
        <Input placeholder="Week reference (e.g. Week 4 - May 2026)" value={weekRef} onChange={e => setWeekRef(e.target.value)} />
        <div className="mt-3">
          <Button onClick={() => generateBrief.mutate()} disabled={generateBrief.isPending} fullWidth>
            {generateBrief.isPending ? 'Generating...' : 'Generate Monday Brief'}
          </Button>
        </div>
      </div>

      {/* Saved briefs (from the database) */}
      {pastBriefs?.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-display text-lg mb-2">Saved Briefs</h4>
          <div className="divide-y divide-border">
            {pastBriefs.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrief(b.brief_json)}
                className="w-full flex items-center justify-between py-2 text-left text-sm hover:bg-cream/40 px-2 rounded"
              >
                <span>
                  <span className="font-medium">{b.week_ref || 'Untitled week'}</span>
                  <span className="text-xs text-muted ml-2">{new Date(b.created_at).toLocaleString('en-IN')}</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  b.brief_json?.overallStatus === 'GREEN' ? 'bg-green-100 text-green-700'
                  : b.brief_json?.overallStatus === 'AMBER' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                }`}>{b.brief_json?.overallStatus || '—'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
 
      {brief && (
        <div className={`p-5 rounded-xl text-white ${
          brief.overallStatus === 'GREEN' ? 'bg-green-700' : brief.overallStatus === 'AMBER' ? 'bg-yellow-600' : 'bg-red-700'
        }`}>
          <p className="text-xs uppercase tracking-widest opacity-80">Project Health</p>
          <p className="text-3xl font-bold mt-1">{brief.overallStatus}</p>
          <p className="mt-2">{brief.headline}</p>
        </div>
      )}

      {brief && (
        <div className="space-y-4">
          {/* Crops */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-display text-lg mb-3">Crop Status</h4>
            {brief.crops?.map(c => (
              <div key={c.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className={`w-3 h-3 rounded-full ${
                  c.status === 'GREEN' ? 'bg-green-500' : c.status === 'AMBER' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <span className="font-semibold">{c.name} <span className="text-xs text-muted">Wk {c.week}</span></span>
                  <p className="text-sm text-muted">{c.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-display text-lg mb-3">Top Actions</h4>
            {brief.actions?.map(a => (
              <div key={a.priority} className="flex gap-3 mb-3 pb-3 border-b last:border-0">
                <span className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center font-bold text-sm">{a.priority}</span>
                <div>
                  <p className="font-semibold">{a.action}</p>
                  <p className="text-xs text-muted">{a.owner} · {a.by}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Risks */}
          {brief.risks?.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-display text-lg mb-3">Risk Radar</h4>
              {brief.risks.map((r, i) => (
                <div key={i} className={`p-3 rounded-lg mb-2 ${r.level === 'HIGH' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <p className="text-xs font-bold uppercase mb-1">{r.level} RISK</p>
                  <p className="font-semibold">{r.risk}</p>
                  <p className="text-sm mt-1">Fix: {r.fix}</p>
                </div>
              ))}
            </div>
          )}

          {brief.founderDecision && (
            <div className="bg-forest p-4 rounded-xl text-white">
              <p className="text-xs uppercase tracking-widest opacity-70">Decision Required</p>
              <p className="mt-1">{brief.founderDecision}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}