"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type ReviewRow = {
  id: string;
  name: string;
  slug: string;
  publication_status: "draft" | "review";
  quality_score: number;
  review: {
    canPublish: boolean;
    missing: string[];
    qualityScore: number;
  };
};

export default function AdminStrainsPage() {
  const { session, user, loading } = useAuth();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const isAdmin = useMemo(() => {
    const ids = (process.env.NEXT_PUBLIC_APP_ADMIN_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return !!user && ids.includes(user.id);
  }, [user]);

  useEffect(() => {
    if (!session?.access_token || !isAdmin) return;

    const load = async () => {
      setFetching(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/strains/review", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = await response.json();
        if (!response.ok) {
          setError(payload?.error?.message ?? payload?.error ?? "Failed to load review queue");
          return;
        }

        setRows(payload?.data?.strains ?? []);
      } catch (requestError) {
        console.error(requestError);
        setError("Failed to load review queue");
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [session?.access_token, isAdmin]);

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  if (!isAdmin) {
    return <main className="p-6">Forbidden</main>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-black uppercase">Strain Review Queue</h1>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {fetching ? <p className="mt-4 text-sm text-black/60">Loading queue...</p> : null}

      <div className="mt-6 grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-black/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">{row.name}</h2>
                <p className="text-xs text-black/60">{row.slug}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-black/50">{row.publication_status}</p>
                <p className="font-bold">{row.review.qualityScore}%</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-black/70">
              Missing: {row.review.missing.length > 0 ? row.review.missing.join(", ") : "ready to publish"}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
