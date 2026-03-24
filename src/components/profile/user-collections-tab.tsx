import { FolderOpen } from "lucide-react";

interface UserCollectionsTabProps {
    displayName: string;
}

export function UserCollectionsTab({ displayName }: UserCollectionsTabProps) {
    return (
        <div className="bg-[#2D5032] border border-[#427249]/50 rounded-2xl px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                <FolderOpen className="h-7 w-7 text-[#A3E4D7]" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A3E4D7] mb-2">
                Sammlung
            </p>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
                No public collections yet
            </h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                {displayName} has not shared any public collection items yet. Published collections will appear here.
            </p>
        </div>
    );
}
