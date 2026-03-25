import { FolderOpen, Loader2, Lock } from "lucide-react";
import { StrainCard } from "@/components/strains/strain-card";
import type { Strain } from "@/lib/types";

export type UserCollectionStrain = Strain & {
    collected_at?: string | null;
    created_by?: string | null;
    user_notes?: string | null;
    image_url?: string;
    avg_thc?: number;
    avg_cbd?: number;
};

interface UserCollectionsTabProps {
    displayName: string;
    collections: UserCollectionStrain[];
    isLoading?: boolean;
    canView?: boolean;
}

export function UserCollectionsTab({
    displayName,
    collections,
    isLoading = false,
    canView = true,
}: UserCollectionsTabProps) {
    if (isLoading) {
        return (
            <div className="bg-[#2D5032] border border-[#427249]/50 rounded-2xl px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                    <Loader2 className="h-7 w-7 text-[#A3E4D7] animate-spin" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A3E4D7] mb-2">
                    Sammlung
                </p>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
                    Sammlung wird geladen
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                    Die Sammlung von {displayName} wird gerade geladen.
                </p>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="bg-[#2D5032] border border-[#427249]/50 rounded-2xl px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                    <Lock className="h-7 w-7 text-[#A3E4D7]" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A3E4D7] mb-2">
                    Sammlung
                </p>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
                    Diese Sammlung ist privat
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                    Du musst mit {displayName} befreundet sein, um diese Sammlung zu sehen.
                </p>
            </div>
        );
    }

    if (collections.length === 0) {
        return (
            <div className="bg-[#2D5032] border border-[#427249]/50 rounded-2xl px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                    <FolderOpen className="h-7 w-7 text-[#A3E4D7]" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A3E4D7] mb-2">
                    Sammlung
                </p>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
                    Noch keine Einträge
                </h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                    {displayName} hat noch keine Sorten in der Sammlung.
                </p>
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#A3E4D7]">
                        Sammlung
                    </p>
                    <h3 className="break-words text-lg font-bold uppercase tracking-tight text-white [overflow-wrap:anywhere]">
                        Archiv von {displayName}
                    </h3>
                </div>
                <div className="text-left sm:text-right">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Anzahl
                    </p>
                    <p className="text-xl font-black text-[#2FF801]">{collections.length}</p>
                </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 xs:grid-cols-2 sm:gap-6">
                {collections.map((strain, index) => (
                    <StrainCard
                        key={`${strain.id}-${strain.collected_at ?? index}`}
                        strain={strain}
                        index={index}
                        isCollected={true}
                    />
                ))}
            </div>
        </div>
    );
}
