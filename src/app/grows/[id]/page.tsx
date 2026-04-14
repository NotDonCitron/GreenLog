import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { GrowDetailClient } from '@/components/grows/grow-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
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
  let userId: string | null = null;

  // Get user from session
  const { data: { session } } = await supabase.auth.getSession();
  userId = session?.user?.id || null;

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
    entries = entriesData || [];

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