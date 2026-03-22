"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Create profile
        await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.toLowerCase().trim(),
          display_name: username.trim(),
        });
        setSuccess(
          "Account erstellt! Check deine E-Mails zur Bestätigung."
        );
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center px-5 pt-12">
      <span className="text-5xl">🌿</span>
      <h1 className="mt-4 text-2xl font-bold">
        {isLogin ? "Willkommen zurück" : "Account erstellen"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isLogin
          ? "Melde dich an um Strains zu bewerten."
          : "Erstelle deinen kostenlosen Account."}
      </p>

      <Card className="mt-8 w-full max-w-sm border-border">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="dein_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">E-Mail</label>
              <Input
                className="mt-1.5 h-11 rounded-xl"
                type="email"
                placeholder="du@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Passwort</label>
              <Input
                className="mt-1.5 h-11 rounded-xl"
                type="password"
                placeholder="Min. 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                {success}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-green-600 hover:bg-green-700 text-white text-base"
            >
              {loading
                ? "Laden..."
                : isLogin
                  ? "Anmelden"
                  : "Registrieren"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-sm text-green-600 font-medium"
            >
              {isLogin
                ? "Noch kein Account? Registrieren"
                : "Schon ein Account? Anmelden"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
