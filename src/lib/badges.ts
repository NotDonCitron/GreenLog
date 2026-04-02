import { SupabaseClient } from '@supabase/supabase-js';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'collection' | 'grow' | 'social' | 'engagement';
  tier: 1 | 2 | 3 | 4;
  criteriaKey: string;
}

export interface BadgeContext {
  supabase: SupabaseClient;
  userId: string;
}

export type BadgeCriteria = (ctx: BadgeContext) => Promise<boolean>;

export const ALL_BADGES: BadgeDefinition[] = [
  // Collection Badges
  { id: 'first-strain', name: 'Greenie', description: '1 Strain gesammelt', icon: 'trophy', category: 'collection', tier: 1, criteriaKey: 'first-strain' },
  { id: 'collector-10', name: 'Sammler', description: '10 Strains gesammelt', icon: 'leaf', category: 'collection', tier: 2, criteriaKey: 'collector-10' },
  { id: 'archive-50', name: 'Archiv', description: '50 Strains gesammelt', icon: 'archive', category: 'collection', tier: 3, criteriaKey: 'archive-50' },
  { id: 'champion-100', name: 'Champion', description: '100 Strains gesammelt', icon: 'crown', category: 'collection', tier: 4, criteriaKey: 'champion-100' },
  { id: 'sativa-5', name: 'Sativa Sammler', description: '5 Sativa Strains', icon: 'sun', category: 'collection', tier: 2, criteriaKey: 'sativa-5' },
  { id: 'indica-5', name: 'Indica Kenner', description: '5 Indica Strains', icon: 'moon', category: 'collection', tier: 2, criteriaKey: 'indica-5' },
  { id: 'hybrid-5', name: 'Hybrid Liebhaber', description: '5 Hybrid Strains', icon: 'sparkles', category: 'collection', tier: 2, criteriaKey: 'hybrid-5' },
  { id: 'pharmacy-10', name: 'Apotheke Favorit', description: '10 Apotheken-Strains', icon: 'building', category: 'collection', tier: 2, criteriaKey: 'pharmacy-10' },
  { id: 'grow-master', name: 'Grow Master', description: '10 Eigenanbau-Strains', icon: 'sprout', category: 'collection', tier: 2, criteriaKey: 'grow-master' },
  { id: 'thc-champion', name: 'THC Champion', description: '5 Strains mit >20% THC', icon: 'zap', category: 'collection', tier: 3, criteriaKey: 'thc-champion' },
  // Grow Badges
  { id: 'first-grow', name: 'Greenhorn', description: 'Erster Grow gestartet', icon: 'sprout', category: 'grow', tier: 1, criteriaKey: 'first-grow' },
  { id: 'harvest-1', name: 'Erntezeit', description: '1 Grow abgeschlossen', icon: 'wheat', category: 'grow', tier: 2, criteriaKey: 'harvest-1' },
  { id: 'perfectionist-5', name: 'Perfektionist', description: '5 Grows abgeschlossen', icon: 'star', category: 'grow', tier: 3, criteriaKey: 'perfectionist-5' },
  // Social Badges
  { id: 'first-follower', name: 'Neuling', description: 'Erster Follower', icon: 'users', category: 'social', tier: 1, criteriaKey: 'first-follower' },
  { id: 'community-10', name: 'Community', description: '10 Follower', icon: 'users', category: 'social', tier: 2, criteriaKey: 'community-10' },
  { id: 'critic-5', name: 'Kritiker', description: '5 Reviews geschrieben', icon: 'pen', category: 'social', tier: 2, criteriaKey: 'critic-5' },
  { id: 'first-post', name: 'Erster Post', description: 'Erster Feed-Post', icon: 'file-text', category: 'social', tier: 1, criteriaKey: 'first-post' },
  // Community Badges
  { id: 'community-joined', name: 'Community Beigetreten', description: 'Einer Community beigetreten', icon: 'home', category: 'social', tier: 1, criteriaKey: 'community-joined' },
  { id: 'organizer', name: 'Organisator', description: 'Admin einer Community', icon: 'shield', category: 'social', tier: 2, criteriaKey: 'organizer' },
  // Engagement Badges
  { id: 'lover-10', name: 'Liebhaber', description: '10 Favoriten', icon: 'heart', category: 'engagement', tier: 2, criteriaKey: 'lover-10' },
  { id: 'streak-7', name: 'Streak', description: '7 Tage aktiv', icon: 'flame', category: 'engagement', tier: 2, criteriaKey: 'streak-7' },
  { id: 'all-star-50', name: 'All-Star', description: '50 verschiedene Strains reviewed', icon: 'sparkles', category: 'engagement', tier: 3, criteriaKey: 'all-star-50' },
  // Special Badges
  { id: 'rare-strain', name: 'Seltene Sorte', description: 'Eine rare Strain geloggt', icon: 'gem', category: 'engagement', tier: 3, criteriaKey: 'rare-strain' },
  { id: 'beta-tester', name: 'Beta Tester', description: 'Early Adopter', icon: 'bug', category: 'engagement', tier: 2, criteriaKey: 'beta-tester' },
  { id: 'anniversary-1', name: 'Jubiläum', description: '1 Jahr Mitglied', icon: 'gift', category: 'engagement', tier: 4, criteriaKey: 'anniversary-1' },
];

export const BADGE_CRITERIA: Record<string, BadgeCriteria> = {
  'first-strain': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'collector-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 10;
  },
  'archive-50': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 50;
  },
  'champion-100': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 100;
  },
  // Collection by type
  'sativa-5': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(type)')
      .eq('user_id', userId);
    const sativaStrains = (data || []).filter((c: any) => c.strains?.type === 'sativa');
    return sativaStrains.length >= 5;
  },
  'indica-5': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(type)')
      .eq('user_id', userId);
    const indicaStrains = (data || []).filter((c: any) => c.strains?.type === 'indica');
    return indicaStrains.length >= 5;
  },
  'hybrid-5': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(type)')
      .eq('user_id', userId);
    const hybridStrains = (data || []).filter((c: any) => c.strains?.type === 'hybrid');
    return hybridStrains.length >= 5;
  },
  // Collection by source
  'pharmacy-10': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(source)')
      .eq('user_id', userId);
    const pharmacyStrains = (data || []).filter((c: any) => c.strains?.source === 'pharmacy');
    return pharmacyStrains.length >= 10;
  },
  'grow-master': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(source)')
      .eq('user_id', userId);
    const growStrains = (data || []).filter((c: any) => c.strains?.source === 'grow');
    return growStrains.length >= 10;
  },
  // THC Champion
  'thc-champion': async ({ supabase, userId }) => {
    const { data } = await supabase
      .from('user_collection').select('strain_id, strains!inner(avg_thc, thc_max)')
      .eq('user_id', userId);
    const highThcStrains = (data || []).filter((c: any) => {
      const thc = c.strains?.avg_thc || c.strains?.thc_max || 0;
      return thc > 20;
    });
    return highThcStrains.length >= 5;
  },
  'first-grow': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'harvest-1': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'completed');
    return (count ?? 0) >= 1;
  },
  'perfectionist-5': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'completed');
    return (count ?? 0) >= 5;
  },
  'first-follower': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('follows').select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    return (count ?? 0) >= 1;
  },
  'community-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('follows').select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    return (count ?? 0) >= 10;
  },
  'critic-5': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 5;
  },
  'first-post': async ({ supabase, userId }) => {
    // Check if user has any feed posts (community_feed entries)
    const { count } = await supabase
      .from('community_feed').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'community-joined': async ({ supabase, userId }) => {
    // Check if user is member of any organization
    const { count } = await supabase
      .from('organization_members').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('membership_status', 'active');
    return (count ?? 0) >= 1;
  },
  'organizer': async ({ supabase, userId }) => {
    // Check if user is admin or gründer of any organization
    const { data } = await supabase
      .from('organization_members').select('role')
      .eq('user_id', userId).eq('membership_status', 'active');
    const isOrganizer = (data || []).some((m: any) => ['admin', 'gründer'].includes(m.role));
    return isOrganizer;
  },
  'lover-10': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('user_strain_relations').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_favorite', true);
    return (count ?? 0) >= 10;
  },
  'streak-7': async ({ supabase, userId }) => {
    // Simple: check if user has activity in last 7 days (at least 7 entries)
    const { data } = await supabase
      .from('user_activities').select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(7);
    return (data?.length ?? 0) >= 7;
  },
  'all-star-50': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('ratings').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 50;
  },
  'rare-strain': async ({ supabase, userId }) => {
    // Check if user has logged any strains (badge criteria: have at least one strain in collection)
    const { count } = await supabase
      .from('user_collection').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'beta-tester': async ({ supabase, userId }) => {
    // Beta testers: profiles created in first month (March 2026)
    const { data } = await supabase
      .from('profiles').select('created_at')
      .eq('id', userId).single();
    if (!data?.created_at) return false;
    const created = new Date(data.created_at);
    const betaDeadline = new Date('2026-04-01');
    return created < betaDeadline;
  },
  'anniversary-1': async ({ supabase, userId }) => {
    // 1 year membership
    const { data } = await supabase
      .from('profiles').select('created_at')
      .eq('id', userId).single();
    if (!data?.created_at) return false;
    const created = new Date(data.created_at);
    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return created <= yearAgo;
  },
};

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGES.find(b => b.id === id);
}

export async function checkAndUnlockBadges(userId: string, supabase: SupabaseClient) {
  const { data: unlockedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const unlockedSet = new Set(unlockedBadges?.map(b => b.badge_id) || []);
  const newlyUnlocked: string[] = [];

  for (const badge of ALL_BADGES) {
    if (unlockedSet.has(badge.id)) continue;

    const criteriaFn = BADGE_CRITERIA[badge.criteriaKey];
    if (!criteriaFn) continue;

    try {
      const qualifies = await criteriaFn({ supabase, userId });
      if (qualifies) {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: userId, badge_id: badge.id });
        if (!error) {
          newlyUnlocked.push(badge.id);
        }
      }
    } catch (err) {
      console.error(`Error checking badge ${badge.id}:`, err);
    }
  }

  return newlyUnlocked;
}
