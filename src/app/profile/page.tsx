"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <span className="text-muted-foreground">Laden...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center px-5 pt-20 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-xl font-bold">Nicht angemeldet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Melde dich an um dein Profil zu sehen.
        </p>
        <Link href="/login">
          <Button className="mt-6 bg-green-600 hover:bg-green-700 text-white h-11 px-8">
            Anmelden
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-5 pt-8">
      <h1 className="text-2xl font-bold">Profil</h1>

      <Card className="mt-6 border-border">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            🌿
          </div>
          <div>
            <h2 className="font-semibold">{user.email}</h2>
            <p className="text-sm text-muted-foreground">
              Dabei seit{" "}
              {new Date(user.created_at).toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Ratings", value: "0", icon: "⭐" },
          { label: "Grows", value: "0", icon: "🌱" },
          { label: "Strains", value: "0", icon: "🌿" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="flex flex-col items-center py-4">
              <span className="text-xl">{stat.icon}</span>
              <span className="mt-1 text-lg font-bold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-8 h-11 w-full text-red-500 border-red-200 hover:bg-red-50"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
      >
        Abmelden
      </Button>
    </div>
  );
}
