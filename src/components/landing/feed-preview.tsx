"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ScrollAnimator } from "./scroll-animator"
import { Leaf, Star, Users, Heart, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Strain } from "@/lib/types"
import { StrainCard } from "@/components/strains/strain-card"

// Narrow type matching the exact query projection
type StrainPreview = Pick<Strain, "id" | "name" | "slug" | "brand" | "farmer" | "manufacturer" | "type" | "thc_max" | "avg_thc" | "flavors" | "image_url">

const DEMO_ACTIVITIES = [
  {
    id: 1,
    user: "Max",
    action: "hat Gorilla Glue #4",
    type: "collected",
    icon: <Leaf size={14} className="text-[#2FF801]" />,
    time: "vor 2 Min",
    suffix: "gesammelt",
  },
  {
    id: 2,
    user: "Sarah",
    action: "hat Sour Diesel",
    type: "rated",
    icon: <Star size={14} className="text-[#F59E0B]" />,
    time: "vor 15 Min",
    rating: 4,
    suffix: "bewertet ★★★★☆",
  },
  {
    id: 3,
    user: "Lukas",
    action: "folgt dir",
    type: "followed",
    icon: <Users size={14} className="text-[#00F5FF]" />,
    time: "vor 32 Min",
    suffix: null,
  },
]

interface FeedPreviewProps {
  strainCount?: number
}

function ActivityItem({ activity }: { activity: typeof DEMO_ACTIVITIES[0] }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
        {activity.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs">
          <span className="font-semibold">{activity.user}</span>{" "}
          {activity.action}
          {activity.suffix && (
            <span className="text-[var(--muted-foreground)]"> {activity.suffix}</span>
          )}
        </p>
      </div>
      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{activity.time}</span>
    </div>
  )
}

export function FeedPreview({ strainCount }: FeedPreviewProps) {
  const [strains, setStrains] = useState<StrainPreview[]>([])

  useEffect(() => {
    async function fetchStrains() {
      try {
        const { data } = await supabase
          .from("strains")
          .select("id, name, slug, brand, farmer, manufacturer, type, thc_max, avg_thc, flavors, image_url")
          .limit(3)
          .order("avg_thc", { ascending: false })

        if (data && data.length > 0) {
          setStrains(data as StrainPreview[])
        }
      } catch (err) {
        console.error("FeedPreview strains error:", err)
      }
    }
    fetchStrains()
  }, [])

  return (
    <section className="relative z-10 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <ScrollAnimator animation="fade-up">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4 font-display text-white">
              So sieht CannaLOG aus
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Sieh dir eine Vorschau der App an: Datensätze, Sammlung und Aktivitätsansicht.
            </p>
          </div>
        </ScrollAnimator>

        {/* Main Preview Grid */}
        <div className="space-y-8">
          {/* Feed Activity */}
          <ScrollAnimator animation="fade-up" delay={100}>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Aktivität</h3>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#2FF801]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)]/30" />
                  <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)]/30" />
                </div>
              </div>
              <div className="space-y-0">
                {DEMO_ACTIVITIES.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Heart size={12} className="text-red-400" />
                  <span>2 neue Benachrichtigungen</span>
                </div>
              </div>
            </div>
          </ScrollAnimator>

          {/* Strain Cards */}
          <ScrollAnimator animation="fade-up" delay={200}>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Beliebte Strains</h3>
                <Link href="/strains" className="text-xs text-[#00F5FF] hover:underline flex items-center gap-1">
                  Alle ansehen <ArrowRight size={12} />
                </Link>
              </div>
              {strains.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {strains.map((strain, i) => (
                    <StrainCard key={strain.id} strain={strain} index={i} isCollected={false} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] rounded-[20px] bg-[var(--accent)] animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </ScrollAnimator>
        </div>

        {/* Bottom Stats Bar */}
        <ScrollAnimator animation="fade-up" delay={300}>
          <div className="mt-8 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-[#00F5FF]">
                  {strainCount ? `${strainCount}+` : "—"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">Strains</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#2FF801]">100%</p>
                <p className="text-xs text-[var(--muted-foreground)]">Basis-Features inkl.</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#a855f7]">∞</p>
                <p className="text-xs text-[var(--muted-foreground)]">Sammlungen</p>
              </div>
            </div>
          </div>
        </ScrollAnimator>
      </div>
    </section>
  )
}
