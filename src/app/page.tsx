import { supabase } from "@/lib/supabase";

export default async function Home() {
  // Test-Abfrage, um zu sehen ob Supabase reagiert
  const { data: strains, error } = await supabase.from('strains').select('count');
  
  const isSupabaseConnected = !error && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#0e0e0f] text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold text-[#00F5FF] mb-8 uppercase tracking-widest">CANNALOG</h1>
        
        <div className={`p-4 rounded-lg border ${isSupabaseConnected ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <p className="text-lg">
            Status: {isSupabaseConnected ? '✅ Supabase ist online!' : '❌ Verbindung fehlt oder Variablen nicht geladen.'}
          </p>
          {!isSupabaseConnected && (
            <p className="text-xs mt-2 text-gray-400">Prüfe die Vercel Environment Variables und starte das Deployment neu.</p>
          )}
        </div>

        <div className="mt-12 text-center text-gray-400">
          <p>Deine Freunde können die Designs hier sehen:</p>
          <a href="/designs.html" className="text-[#2FF801] hover:underline">Designs anschauen</a>
        </div>
      </div>
    </main>
  );
}
