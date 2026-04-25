"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { resolvePublicMediaUrl } from "@/lib/public-media-url";

interface OrgLogoUploadProps {
    currentLogoUrl?: string | null;
    organizationId: string;
    onSuccess?: (url: string) => void;
    size?: number;
}

export function OrgLogoUpload({
    currentLogoUrl,
    organizationId,
    onSuccess,
    size = 80,
}: OrgLogoUploadProps) {
    const { user, session } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { error: toastError } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith("image/")) {
            toastError("Bitte ein Bild auswählen");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toastError("Maximal 2MB erlaubt");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
            if (!session?.access_token) throw new Error("Missing session");

            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch(`/api/organizations/${organizationId}/logo`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error?.message || "Upload failed");
            }

            const logoUrl = result.data.logo_url as string;
            setPreviewUrl(null);
            onSuccess?.(logoUrl);
        } catch (err) {
            console.error("Error uploading logo:", err);
            toastError("Upload fehlgeschlagen");
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    const displayUrl = previewUrl || currentLogoUrl;

    return (
        <div className="relative inline-block">
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-full overflow-hidden bg-[#2FF801]/10 border-2 border-[#2FF801]/30 hover:border-[#2FF801]/60 transition-colors"
                style={{ width: size, height: size }}
            >
                {displayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={resolvePublicMediaUrl(displayUrl) ?? ""}
                        alt="Community Logo"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Camera size={size * 0.3} className="text-[#2FF801]/60" />
                    </div>
                )}
            </button>

            {user && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 bg-[#2FF801] text-black rounded-full p-1.5 hover:bg-[#2FF801]/80 transition-colors disabled:opacity-50"
                >
                    {isUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Camera size={12} />
                    )}
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
