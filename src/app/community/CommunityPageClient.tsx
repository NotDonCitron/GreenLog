"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { Leaf, Building2, Loader2, Plus, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { USER_ROLES } from "@/lib/roles";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  organization_type: string;
  license_number: string | null;
  status: string;
  logo_url?: string | null;
}

interface MemberOrg extends Organization {
  membership_role?: string;
  position?: number;
}

interface SortableOrg extends MemberOrg {
  relationId: string;
}

function OrgTypeLabel({ type }: { type: string }) {
  const label = type === "club" ? "Club" : type === "pharmacy" ? "Apotheke" : type;
  return (
    <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
      {label}
    </span>
  );
}

function SortableCommunityCard({ org, role }: { org: SortableOrg; role?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: org.relationId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} data-relation-id={org.relationId}>
      <Link href={`/community/${org.id}`}>
        <Card className="bg-[var(--card)] border border-[var(--border)]/50 p-5 rounded-3xl hover:border-[#00F5FF]/50 transition-all cursor-pointer">
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={14} className="text-[var(--muted-foreground)]" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 flex items-center justify-center shrink-0 overflow-hidden">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <Leaf size={20} className="text-[#2FF801]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-sm truncate text-[var(--foreground)]">{org.name}</p>
              <OrgTypeLabel type={org.organization_type} />
            </div>
            {role && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/20 text-[#00F5FF]">
                {role === USER_ROLES.GRUENDER ? "Gründer" : role === USER_ROLES.ADMIN ? "Admin" : "Member"}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-[var(--muted)] border border-[var(--border)]/50 flex items-center justify-center shrink-0">
              <Building2 size={14} className="text-[var(--muted-foreground)]" />
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}

export default function CommunityPageClient() {
  const { user, memberships } = useAuth();
  const [myOrgs, setMyOrgs] = useState<MemberOrg[]>([]);
  const [otherOrgs, setOtherOrgs] = useState<Organization[]>([]);
  const [sortableOtherOrgs, setSortableOtherOrgs] = useState<SortableOrg[]>([]);
  const [myOrgsInitialized, setMyOrgsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingMyOrder, setSavingMyOrder] = useState(false);
  const mountedRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Wait for client hydration
  useEffect(() => {
    mountedRef.current = true;
    setTimeout(() => setHydrated(true), 0);
    return () => { mountedRef.current = false; };
  }, []);

  // Sync sortable other orgs when otherOrgs or user changes
  useEffect(() => {
    if (otherOrgs.length > 0) {
      setSortableOtherOrgs(
        otherOrgs.map((org) => ({
          ...org,
          relationId: `other-${org.id}`,
          position: 0,
        }))
      );
    }
  }, [otherOrgs]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    async function fetchOrganizations() {
      try {
        if (!user) {
          const { data } = await supabase
            .from("organizations")
            .select("id, name, slug, organization_type, license_number, status, logo_url")
            .eq("status", "active")
            .order("name", { ascending: true })
            .limit(50);

          if (cancelled || !mountedRef.current) return;
          setOtherOrgs(data || []);
          setLoading(false);
          return;
        }

        const { data: allOrgs } = await supabase
          .from("organizations")
          .select("id, name, slug, organization_type, license_number, status, logo_url")
          .eq("status", "active")
          .order("name", { ascending: true })
          .limit(50);

        // Fetch user's custom ordering (my orgs: position -1 to -999, others: position 0+)
        const { data: savedOrder } = await supabase
          .from("user_community_order")
          .select("organization_id, position")
          .eq("user_id", user.id);

        if (cancelled || !mountedRef.current) return;

        const orderMap = new Map((savedOrder || []).map((o) => [o.organization_id, o.position]));

        const myOrgIds = new Set(memberships.map((m) => m.organization_id));
        const mine: MemberOrg[] = [];
        const others: Organization[] = [];

        for (const org of allOrgs || []) {
          if (myOrgIds.has(org.id)) {
            const membership = memberships.find((m) => m.organization_id === org.id);
            mine.push({ ...org, membership_role: membership?.role, position: orderMap.get(org.id) ?? -1000 - mine.length });
          } else {
            others.push({ ...org, position: orderMap.get(org.id) ?? 0 });
          }
        }

        // Sort my orgs by saved position (default: by name as fallback)
        mine.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        // Sort others by saved position
        others.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        if (!cancelled && mountedRef.current) {
          setMyOrgs(mine);
          setOtherOrgs(others);
          setSortableOtherOrgs(
            others.map((org) => ({
              ...org,
              membership_role: undefined,
              relationId: `other-${org.id}`,
            }))
          );
          setMyOrgsInitialized(true);
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void fetchOrganizations();
    return () => { cancelled = true; };
  }, [user, memberships, hydrated]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine which list this belongs to based on prefix
    if (activeId.startsWith("my-")) {
      setMyOrgs((items) => {
        const oldIndex = items.findIndex((item) => `my-${item.id}` === activeId);
        const newIndex = items.findIndex((item) => `my-${item.id}` === overId);
        if (oldIndex === -1 || newIndex === -1) return items;
        const reordered = arrayMove(items, oldIndex, newIndex);
        setSavingMyOrder(true);
        fetch("/api/community/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "my", orderedOrgIds: reordered.map((o) => o.id) }),
        }).finally(() => setSavingMyOrder(false));
        return reordered;
      });
    } else {
      setSortableOtherOrgs((items) => {
        const oldIndex = items.findIndex((item) => item.relationId === activeId);
        const newIndex = items.findIndex((item) => item.relationId === overId);
        if (oldIndex === -1 || newIndex === -1) return items;
        const reordered = arrayMove(items, oldIndex, newIndex);
        setSavingOrder(true);
        fetch("/api/community/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "other", orderedOrgIds: reordered.map((o) => o.id) }),
        }).finally(() => setSavingOrder(false));
        return reordered;
      });
    }
  };

  return (
    <>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2FF801]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#00F5FF]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-6 pt-12 pb-4 relative z-10">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none font-display text-[var(--foreground)]">
          Communities
        </h1>
      </header>

      <div className="px-6 space-y-6 mt-4 relative z-10 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#00F5FF]" />
          </div>
        ) : (
          <>
            {/* My Communities — always first, drag-and-drop sortable */}
            {myOrgs.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                  Meine Communities
                </h2>
                {savingMyOrder && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Speichere Reihenfolge…</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={myOrgs.map((o) => `my-${o.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {myOrgs.map((org) => (
                        <SortableCommunityCard
                          key={org.id}
                          org={{ ...org, relationId: `my-${org.id}` }}
                          role={org.membership_role}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            )}

            {/* Create new community CTA — only if user has no community yet */}
            {myOrgs.length === 0 && (
              <Link href="/community/new">
                <Card className="bg-[#2FF801]/10 border border-[#2FF801]/30 p-4 rounded-3xl hover:bg-[#2FF801]/20 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2FF801]/20 border border-[#2FF801]/40 flex items-center justify-center shrink-0">
                      <Plus size={16} className="text-[#2FF801]" />
                    </div>
                    <p className="font-black text-sm text-[#2FF801]">Community erstellen</p>
                  </div>
                </Card>
              </Link>
            )}

            {/* Other Communities — drag-and-drop sortable */}
            {sortableOtherOrgs.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
                  {myOrgs.length > 0 ? "Andere Communities" : "Communities"}
                </h2>
                {savingOrder && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Speichere Reihenfolge…</p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortableOtherOrgs.map((o) => o.relationId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {sortableOtherOrgs.map((org) => (
                        <SortableCommunityCard key={org.relationId} org={org} role={org.membership_role} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            )}

            {myOrgs.length === 0 && sortableOtherOrgs.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--card)] border border-[var(--border)]/50 flex items-center justify-center mx-auto">
                  <Building2 size={24} className="text-[#484849]" />
                </div>
                <p className="text-[var(--muted-foreground)] text-sm">Es gibt noch keine Communities.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </>
  );
}
