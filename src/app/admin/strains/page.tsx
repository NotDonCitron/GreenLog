'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Strain {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  thc_min: number | null;
  thc_max: number | null;
  cbd_min: number | null;
  cbd_max: number | null;
  terpenes: string[];
  flavors: string[];
  effects: string[];
  image_url: string | null;
  publication_status: string;
  primary_source: string;
  source_notes: string | null;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-600 min-w-[100px]">{label}:</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

export default function AdminStrainsPage() {
  const { user, loading: authLoading } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ADMIN_IDS = (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || '').split(',').filter(Boolean);
  const isAdmin = user && ADMIN_IDS.includes(user.id);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;
    fetchStrains();
  }, [authLoading, isAdmin]);

  const fetchStrains = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('strains')
      .select('*')
      .in('publication_status', ['draft', 'review'])
      .order('name');

    if (err) {
      console.error('Error fetching strains:', err);
      setError(err.message);
    } else {
      setStrains(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error: err } = await supabase
      .from('strains')
      .update({
        publication_status: status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (err) console.error('Error updating status:', err);
    else fetchStrains();
  };

  const checkCompleteness = (strain: Strain) => {
    const checks = {
      name: !!strain.name,
      slug: !!strain.slug,
      type: !!strain.type,
      description: !!strain.description,
      thc: strain.thc_min !== null || strain.thc_max !== null,
      cbd: strain.cbd_min !== null || strain.cbd_max !== null,
      terpenes: Array.isArray(strain.terpenes) && strain.terpenes.length >= 2,
      flavors: Array.isArray(strain.flavors) && strain.flavors.length >= 1,
      effects: Array.isArray(strain.effects) && strain.effects.length >= 1,
      image: !!strain.image_url,
      source: !!strain.primary_source,
    };
    return checks;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full p-10 border border-red-500/20 rounded-lg bg-white shadow-2xl text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={64} />
          <h1 className="text-xl font-bold text-red-500 uppercase tracking-tight">Access Denied</h1>
          <p className="text-gray-500 text-sm mt-2">Admin access required for this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-red-500 text-center">
          <AlertCircle size={48} className="mx-auto mb-2" />
          <p>Error: {error}</p>
          <button onClick={fetchStrains} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Strain Review Queue ({strains.length})</h1>

      {strains.length === 0 ? (
        <p className="text-gray-500">No strains in draft or review status.</p>
      ) : (
        <div className="space-y-4">
          {strains.map((strain) => {
            const completeness = checkCompleteness(strain);
            const completeCount = Object.values(completeness).filter(Boolean).length;
            const isComplete = completeCount === Object.keys(completeness).length;

            const isExpanded = expandedId === strain.id;

            return (
              <div key={strain.id} className="border rounded-lg p-4 bg-white shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{strain.name}</h2>
                    <p className="text-gray-600">{strain.type} • {strain.primary_source}</p>
                    <p className="text-sm text-gray-500">Completeness: {completeCount}/11</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : strain.id)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {isExpanded ? 'Weniger' : 'Details'}
                    </button>
                    <button
                      onClick={() => updateStatus(strain.id, 'review')}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                      disabled={strain.publication_status === 'review'}
                    >
                      To Review
                    </button>
                    <button
                      onClick={() => updateStatus(strain.id, 'published')}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={!isComplete}
                      title={!isComplete ? 'Needs all 11 completeness checks' : 'Publish'}
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => updateStatus(strain.id, 'rejected')}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className={completeness.name ? 'text-green-600' : 'text-red-600'}>✓ Name</div>
                  <div className={completeness.slug ? 'text-green-600' : 'text-red-600'}>✓ Slug</div>
                  <div className={completeness.type ? 'text-green-600' : 'text-red-600'}>✓ Type</div>
                  <div className={completeness.description ? 'text-green-600' : 'text-red-600'}>✓ Description</div>
                  <div className={completeness.thc ? 'text-green-600' : 'text-red-600'}>✓ THC</div>
                  <div className={completeness.cbd ? 'text-green-600' : 'text-red-600'}>✓ CBD</div>
                  <div className={completeness.terpenes ? 'text-green-600' : 'text-red-600'}>✓ Terpenes (2+)</div>
                  <div className={completeness.flavors ? 'text-green-600' : 'text-red-600'}>✓ Flavors (1+)</div>
                  <div className={completeness.effects ? 'text-green-600' : 'text-red-600'}>✓ Effects (1+)</div>
                  <div className={completeness.image ? 'text-green-600' : 'text-red-600'}>✓ Image</div>
                  <div className={completeness.source ? 'text-green-600' : 'text-red-600'}>✓ Source</div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <FieldRow label="Name" value={strain.name} />
                      <FieldRow label="Slug" value={strain.slug} />
                      <FieldRow label="Type" value={strain.type} />
                      <FieldRow label="Source" value={strain.primary_source} />
                      <FieldRow label="THC" value={
                        strain.thc_min !== null && strain.thc_max !== null
                          ? `${strain.thc_min}–${strain.thc_max}%`
                          : strain.thc_min !== null ? `min ${strain.thc_min}%`
                          : strain.thc_max !== null ? `max ${strain.thc_max}%`
                          : '—'
                      } />
                      <FieldRow label="CBD" value={
                        strain.cbd_min !== null && strain.cbd_max !== null
                          ? `${strain.cbd_min}–${strain.cbd_max}%`
                          : strain.cbd_min !== null ? `min ${strain.cbd_min}%`
                          : strain.cbd_max !== null ? `max ${strain.cbd_max}%`
                          : '—'
                      } />
                      <FieldRow label="Terpenes" value={Array.isArray(strain.terpenes) ? strain.terpenes.join(', ') : '—'} />
                      <FieldRow label="Flavors" value={Array.isArray(strain.flavors) ? strain.flavors.join(', ') : '—'} />
                      <FieldRow label="Effects" value={Array.isArray(strain.effects) ? strain.effects.join(', ') : '—'} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="font-medium text-gray-700 mb-1">Description:</p>
                      <p className="text-gray-600 whitespace-pre-wrap">{strain.description || '—'}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="font-medium text-gray-700 mb-1">Source Notes:</p>
                      <p className="text-gray-600 whitespace-pre-wrap">{strain.source_notes || '—'}</p>
                    </div>
                    {strain.image_url && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="font-medium text-gray-700 mb-2">Image:</p>
                        <img
                          src={strain.image_url}
                          alt={strain.name}
                          className="w-48 h-48 object-cover rounded border"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
