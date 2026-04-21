import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { GrowDetailClient } from '@/components/grows/grow-detail-client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { minioCreateSignedUrl } from '@/lib/minio-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function createSignedGrowPhotoUrl(photoPath: string): Promise<string | null> {
  const result = await minioCreateSignedUrl('grow-entry-photos', photoPath, 60 * 60);

  if (result.data?.signedUrl) return result.data.signedUrl;

  try {
    const admin = getSupabaseAdmin();
    const { data: adminData, error } = await admin.storage
      .from('grow-entry-photos')
      .createSignedUrl(photoPath, 60 * 60);

    if (error || !adminData?.signedUrl) return null;
    return adminData.signedUrl;
  } catch {
    return null;
  }
}

async function attachSignedPhotoUrls(entries: any[]) {
  const entriesWithPhotoPaths = entries.filter(entry => (
    typeof entry.content?.photo_path === 'string'
    && entry.content.photo_path.length > 0
  ));

  if (entriesWithPhotoPaths.length === 0) return entries;

  return Promise.all(entries.map(async (entry) => {
    const photoPath = entry.content?.photo_path;
    if (typeof photoPath !== 'string' || photoPath.length === 0) return entry;

    const signedUrl = await createSignedGrowPhotoUrl(photoPath);
    if (!signedUrl) return entry;

    return {
      ...entry,
      content: {
        ...entry.content,
        signed_photo_url: signedUrl,
      },
    };
  }));
}

export default async function GrowDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const cookieStore = await cookies();
  const isDemoMode = cookieStore.get('cannalog_demo_mode')?.value === 'true';

  let grow = null;
  let plants: any[] = [];
  let entries: any[] = [];
  let milestones: any[] = [];
  let reminders: any[] = [];
  let comments: any[] = [];
  let followerCount = 0;

  if (isDemoMode) {
    grow = {
      id,
      title: "Demo Grow",
      grow_type: "indoor",
      status: "active",
      is_public: true,
      start_date: new Date().toISOString().split('T')[0],
      strains: { id: 'demo', name: "Gorilla Glue #4", slug: "gorilla-glue-4" },
      user_id: 'demo-user',
    };
    plants = [];
    entries = [];
    milestones = [];
    reminders = [];
    comments = [];
    followerCount = 0;
  } else {
    // Fetch grow with strain
    const { data: growData, error: growError } = await supabase
      .from("grows")
      .select("*, strains(id, name, slug)")
      .eq("id", id)
      .single();

    if (growError || !growData) {
      notFound();
    }
    grow = growData;

    // Fetch plants
    const { data: plantsData } = await supabase
      .from("plants")
      .select("*")
      .eq("grow_id", id)
      .order("created_at", { ascending: true });
    plants = plantsData || [];

    // Fetch entries (descending by created_at)
    const { data: entriesData } = await supabase
      .from("grow_entries")
      .select("*")
      .eq("grow_id", id)
      .order("created_at", { ascending: false });
    entries = await attachSignedPhotoUrls(entriesData || []);

    // Fetch milestones
    const { data: milestonesData } = await supabase
      .from("grow_milestones")
      .select("*")
      .eq("grow_id", id)
      .order("started_at", { ascending: true });
    milestones = milestonesData || [];

    // Fetch reminders
    const { data: remindersData } = await supabase
      .from("grow_reminders")
      .select("*")
      .eq("grow_id", id)
      .order("due_date", { ascending: true });
    reminders = remindersData || [];

    // Fetch comments with profiles
    const { data: commentsData } = await supabase
      .from("grow_comments")
      .select("*, profiles(id, username, display_name, avatar_url)")
      .eq("grow_id", id)
      .order("created_at", { ascending: true });
    comments = commentsData || [];

    // Fetch follower count
    const { count } = await supabase
      .from("grow_follows")
      .select("*", { count: 'exact', head: true })
      .eq("grow_id", id);
    followerCount = count || 0;
  }

  return (
    <GrowDetailClient
      initialGrow={grow}
      initialPlants={plants}
      initialEntries={entries}
      initialMilestones={milestones}
      initialReminders={reminders}
      initialComments={comments}
      initialFollowerCount={followerCount}
    />
  );
}
