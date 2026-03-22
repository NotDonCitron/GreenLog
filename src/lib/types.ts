export interface Strain {
  id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid';
  brand?: string;
  manufacturer?: string;
  irradiation?: string;
  thc_min?: number;
  thc_max?: number;
  cbd_min?: number;
  cbd_max?: number;
  image_url?: string;
  description?: string;
  terpenes?: string[];
  effects?: string[];
  genetics?: string;
  indications?: string[];
  is_medical?: boolean;
}

export interface Grow {
  id: string;
  user_id: string;
  strain_id: string | null;
  title: string;
  grow_type: 'indoor' | 'outdoor' | 'greenhouse';
  status: 'active' | 'completed' | 'archived';
  start_date: string;
  harvest_date?: string;
  is_public: boolean;
  strains?: {
    name: string;
  };
}
