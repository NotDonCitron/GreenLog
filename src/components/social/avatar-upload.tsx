"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    username: string;
    displayName?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
};

function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const cleaned = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    return cleaned || "?";
}

export function AvatarUpload({
    currentAvatarUrl,
    username,
    displayName,
    size = "lg",
    className = "",
}: AvatarUploadProps) {
    const { user } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB");
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        setIsUploading(true);

        try {
            // Generate unique filename
            const ext = file.name.split(".").pop();
            const filename = `${user.id}/${Date.now()}.${ext}`;

            // Upload to Supabase Storage
            const { data, error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filename, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filename);

            // Update profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ avatar_url: urlData.publicUrl })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setPreviewUrl(null);
            router.refresh();
        } catch (err) {
            console.error("Error uploading avatar:", err);
            alert("Failed to upload avatar");
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    const displayUrl = previewUrl || currentAvatarUrl;

    return (
        <div className={`relative inline-block ${className}`}>
            <Avatar className={`${sizeClasses[size]} cursor-pointer`} onClick={() => user && fileInputRef.current?.click()}>
                <AvatarImage src={displayUrl || undefined} alt={displayName ?? username} />
                <AvatarFallback className="text-lg">{getInitials(displayName ?? username)}</AvatarFallback>
            </Avatar>

            {user && (
                <>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Camera className="h-3 w-3" />
                        )}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </>
            )}
        </div>
    );
}
