"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Plus, Shield, Users, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";

function formatRoleLabel(role: string) {
    switch (role) {
        case "owner":
            return "Owner";
        case "admin":
            return "Admin";
        case "staff":
            return "Staff";
        case "member":
            return "Mitglied";
        default:
            return role;
    }
}

function formatOrganizationType(type: string | undefined) {
    switch (type) {
        case "club":
            return "Club";
        case "pharmacy":
            return "Apotheke";
        default:
            return "Organisation";
    }
}

export function OrganizationSwitcher() {
    const {
        user,
        session,
        memberships,
        activeOrganization,
        membershipsLoading,
        setActiveOrganizationId,
        refreshMemberships,
    } = useAuth();

    const router = useRouter();

    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newOrg, setNewOrg] = useState({ name: "", slug: "", type: "club" as "club" | "pharmacy" });

    const hasMemberships = memberships.length > 0;
    const isAlreadyGründer = memberships.some((m) => m.role === "gründer");

    const activeMeta = useMemo(() => {
        if (!activeOrganization?.organizations) {
            return null;
        }

        return {
            name: activeOrganization.organizations.name,
            type: formatOrganizationType(activeOrganization.organizations.organization_type),
            role: formatRoleLabel(activeOrganization.role),
        };
    }, [activeOrganization]);

    const handleCreateOrganization = async () => {
        if (!newOrg.name || !newOrg.slug) return;

        setIsCreating(true);
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }

            const response = await fetch("/api/organizations", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: newOrg.name,
                    slug: newOrg.slug,
                    organization_type: newOrg.type,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.details || "Failed to create organization");
            }

            // Refresh memberships to show the new organization
            await refreshMemberships();
            setShowCreateForm(false);
            setNewOrg({ name: "", slug: "", type: "club" });
        } catch (error) {
            console.error("Error creating organization:", error);
            alert("Fehler beim Erstellen der Organisation");
        } finally {
            setIsCreating(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    };

    if (!user || membershipsLoading) {
        return (
            <Card className="bg-white/5 border-white/10 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3 text-white/70">
                    <Loader2 className="animate-spin text-[#00F5FF]" size={16} />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Workspace</p>
                        <p className="text-sm font-semibold">Organisationen werden geladen</p>
                    </div>
                </div>
            </Card>
        );
    }

    if (!hasMemberships && !showCreateForm) {
        return (
            <Card className="bg-white/5 border-white/10 p-4 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-[#00F5FF]/10 p-2 text-[#00F5FF]">
                        <Building2 size={18} />
                    </div>
                    <div className="space-y-3 flex-1">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Workspace</p>
                            <p className="text-sm font-semibold text-white">Noch keine Organisation aktiv</p>
                            <p className="text-xs text-white/50">
                                {isAlreadyGründer
                                    ? "Du hast bereits eine Community gegründet."
                                    : "Erstelle einen Workspace für deinen Club oder deine Apotheke."}
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push("/community/new")}
                            disabled={isAlreadyGründer}
                            className="w-full bg-[#2FF801] hover:bg-[#2FF801]/80 text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} className="mr-2" />
                            Community gründen
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (showCreateForm) {
        return (
            <Card className="bg-white/5 border-white/10 p-4 backdrop-blur-xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Neue Organisation</p>
                        <button onClick={() => setShowCreateForm(false)} className="text-white/40 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">Name</label>
                            <Input
                                value={newOrg.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setNewOrg(prev => ({
                                        ...prev,
                                        name,
                                        slug: generateSlug(name)
                                    }));
                                }}
                                placeholder="Mein Club"
                                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">Slug (URL)</label>
                            <Input
                                value={newOrg.slug}
                                onChange={(e) => setNewOrg(prev => ({ ...prev, slug: e.target.value }))}
                                placeholder="mein-club"
                                className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">Typ</label>
                            <Select
                                value={newOrg.type}
                                onValueChange={(value) => setNewOrg(prev => ({ ...prev, type: value as "club" | "pharmacy" }))}
                            >
                                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a191b] border-white/10 text-white">
                                    <SelectItem value="club">Club</SelectItem>
                                    <SelectItem value="pharmacy">Apotheke</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleCreateOrganization}
                            disabled={isCreating || !newOrg.name || !newOrg.slug}
                            className="w-full bg-[#2FF801] hover:bg-[#2FF801]/80 text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {isCreating ? (
                                <Loader2 size={14} className="animate-spin mr-2" />
                            ) : null}
                            Erstellen
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10 p-4 backdrop-blur-xl shadow-2xl">
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Aktiver Workspace</p>
                        <h3 className="text-base font-black uppercase tracking-tight text-white">
                            {activeMeta?.name ?? "Organisation auswählen"}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-white/55">
                            <span className="inline-flex items-center gap-1.5">
                                <Users size={12} className="text-[#00F5FF]" />
                                {activeMeta?.type ?? "Organisation"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Shield size={12} className="text-[#2FF801]" />
                                {activeMeta?.role ?? "Keine Rolle"}
                            </span>
                        </div>
                    </div>
                    {activeOrganization && (
                        <div className="rounded-full bg-[#2FF801]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#2FF801]">
                            Aktiv
                        </div>
                    )}
                </div>

                <Select
                    value={activeOrganization?.organization_id ?? memberships[0]?.organization_id ?? ""}
                    onValueChange={(value) => setActiveOrganizationId(value || null)}
                >
                    <SelectTrigger className="h-12 w-full rounded-2xl border-white/10 bg-[#1a191b] text-white focus:border-[#00F5FF]">
                        <SelectValue placeholder="Organisation auswählen">
                            {activeMeta?.name ?? "Organisation auswählen"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#1a191b] text-white">
                        {memberships.map((membership) => {
                            const organization = membership.organizations;
                            if (!organization) {
                                return null;
                            }

                            return (
                                <SelectItem key={membership.organization_id} value={membership.organization_id}>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Check
                                            size={14}
                                            className={membership.organization_id === activeOrganization?.organization_id ? "text-[#2FF801]" : "text-transparent"}
                                        />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate font-semibold">{organization.name}</span>
                                            <span className="truncate text-[10px] uppercase tracking-[0.2em] text-white/45">
                                                {formatOrganizationType(organization.organization_type)} · {formatRoleLabel(membership.role)}
                                            </span>
                                        </div>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>
        </Card>
    );
}
