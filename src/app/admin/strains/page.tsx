'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export default function AdminStrainsPage() {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrains();
  }, []);

  const fetchStrains = async () => {
    const { data, error } = await supabase
      .from('strains')
      .select('*')
      .in('publication_status', ['draft', 'review'])
      .order('name');

    if (error) console.error('Error fetching strains:', error);
    else setStrains(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('strains')
      .update({
        publication_status: status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) console.error('Error updating status:', error);
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
      terpenes: strain.terpenes.length >= 2,
      flavors: strain.flavors.length >= 1,
      effects: strain.effects.length >= 1,
      image: !!strain.image_url,
      source: !!strain.primary_source,
    };
    return checks;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Strain Review Queue</h1>
      <div className="space-y-4">
        {strains.map((strain) => {
          const completeness = checkCompleteness(strain);
          const completeCount = Object.values(completeness).filter(Boolean).length;
          const isComplete = completeCount === Object.keys(completeness).length;

          return (
            <div key={strain.id} className="border rounded-lg p-4 bg-white shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{strain.name}</h2>
                  <p className="text-gray-600">{strain.type} • {strain.primary_source}</p>
                  <p className="text-sm text-gray-500">Completeness: {completeCount}/11</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(strain.id, 'review')}
                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                    disabled={strain.publication_status === 'review'}
                  >
                    To Review
                  </button>
                  <button
                    onClick={() => updateStatus(strain.id, 'published')}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                    disabled={!isComplete}
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => updateStatus(strain.id, 'rejected')}
                    className="px-3 py-1 bg-red-500 text-white rounded"
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

              {strain.description && (
                <p className="mt-2 text-gray-700">{strain.description}</p>
              )}

              {strain.image_url && (
                <img src={strain.image_url} alt={strain.name} className="mt-2 w-32 h-32 object-cover" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}