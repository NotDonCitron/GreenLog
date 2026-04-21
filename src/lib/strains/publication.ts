import { Strain } from "@/lib/types";

export type StrainPublicationRequirement =
  | "description"
  | "thc"
  | "cbd"
  | "terpenes"
  | "flavors"
  | "effects"
  | "image"
  | "source";

export interface StrainPublicationSnapshot {
  canPublish: boolean;
  missing: StrainPublicationRequirement[];
  qualityScore: number;
}

export function getStrainPublicationSnapshot(
  strain: Partial<Strain>
): StrainPublicationSnapshot {
  const missing: StrainPublicationRequirement[] = [];

  if (!strain.description?.trim()) missing.push("description");
  if (strain.thc_min == null && strain.thc_max == null) missing.push("thc");
  if (strain.cbd_min == null && strain.cbd_max == null) missing.push("cbd");
  if ((strain.terpenes?.length ?? 0) < 2) missing.push("terpenes");
  if ((strain.flavors?.length ?? 0) < 1) missing.push("flavors");
  if ((strain.effects?.length ?? 0) < 1) missing.push("effects");
  if (!strain.image_url?.trim() && !strain.canonical_image_path?.trim()) missing.push("image");
  if (!strain.primary_source?.trim()) missing.push("source");

  const totalChecks = 8;
  const completedChecks = totalChecks - missing.length;

  return {
    canPublish: missing.length === 0,
    missing,
    qualityScore: Math.round((completedChecks / totalChecks) * 100),
  };
}
