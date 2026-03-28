import { createClient } from '@supabase/supabase-js';

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
  supabase: ReturnType<typeof createClient>;
  userId: string;
}

export type BadgeCriteria = (ctx: BadgeContext) => Promise<boolean>;

export const ALL_BADGES: BadgeDefinition[] = [
  { id: 'first-strain', name: 'Greenie', description: '1 Strain gesammelt', icon: 'trophy', category: 'collection', tier: 1, criteriaKey: 'first-strain' },
  { id: 'collector-10', name: 'Sammler', description: '10 Strains gesammelt', icon: 'leaf', category: 'collection', tier: 2, criteriaKey: 'collector-10' },
  { id: 'archive-50', name: 'Archiv', description: '50 Strains gesammelt', icon: 'archive', category: 'collection', tier: 3, criteriaKey: 'archive-50' },
  { id: 'champion-100', name: 'Champion', description: '100 Strains gesammelt', icon: 'crown', category: 'collection', tier: 4, criteriaKey: 'champion-100' },
  { id: 'first-grow', name: 'Greenhorn', description: 'Erster Grow gestartet', icon: 'sprout', category: 'grow', tier: 1, criteriaKey: 'first-grow' },
  { id: 'harvest-1', name: 'Erntezeit', description: '1 Grow abgeschlossen', icon: 'wheat', category: 'grow', tier: 2, criteriaKey: 'harvest-1' },
  { id: 'perfectionist-5', name: 'Perfektionist', description: '5 Grows abgeschlossen', icon: 'star', category: 'grow', tier: 3, criteriaKey: 'perfectionist-5' },
  { id: 'first-follower', name: 'Neuling', description: 'Erster Follower', icon: 'users', category: 'social', tier: 1, criteriaKey: 'first-follower' },
  { id: 'community-10', name: 'Community', description: '10 Follower', icon: 'users', category: 'social', tier: 2, criteriaKey: 'community-10' },
  { id: 'critic-5', name: 'Kritiker', description: '5 Reviews geschrieben', icon: 'pen', category: 'social', tier: 2, criteriaKey: 'critic-5' },
  { id: 'lover-10', name: 'Liebhaber', description: '10 Favoriten', icon: 'heart', category: 'engagement', tier: 2, criteriaKey: 'lover-10' },
  { id: 'streak-7', name: 'Streak', description: '7 Tage aktiv', icon: 'flame', category: 'engagement', tier: 2, criteriaKey: 'streak-7' },
  { id: 'all-star-50', name: 'All-Star', description: '50 verschiedene Strains reviewed', icon: 'sparkles', category: 'engagement', tier: 3, criteriaKey: 'all-star-50' },
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
  'first-grow': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return (count ?? 0) >= 1;
  },
  'harvest-1': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('stage', 'harvested');
    return (count ?? 0) >= 1;
  },
  'perfectionist-5': async ({ supabase, userId }) => {
    const { count } = await supabase
      .from('grows').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('stage', 'harvested');
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
};

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return ALL_BADGES.find(b => b.id === id);
}
