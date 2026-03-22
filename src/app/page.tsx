import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

const features = [
  {
    icon: "🌱",
    title: "Strains bewerten",
    description: "Geschmack, Wirkung & Aussehen — teile deine Erfahrungen.",
  },
  {
    icon: "📓",
    title: "Grow-Tagebuch",
    description: "Dokumentiere deinen Grow mit Fotos und Messwerten.",
  },
  {
    icon: "👥",
    title: "Community",
    description: "Entdecke Sorten und lerne von anderen Growern.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center px-5 pt-12 pb-8 text-center">
        <span className="text-5xl">🌿</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Dein Cannabis-
          <span className="text-green-600">Logbuch</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Bewerte Strains, dokumentiere deinen Grow und entdecke neue Sorten.
        </p>
        <div className="mt-6 flex w-full flex-col gap-3 px-4">
          <Link href="/strains">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base">
              Strains entdecken
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full h-12 text-base">
              Kostenlos starten
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-5 rounded-xl bg-muted/50 py-5">
        <div className="flex items-center justify-around">
          {[
            { value: "500+", label: "Strains" },
            { value: "2k+", label: "Reviews" },
            { value: "800+", label: "Grower" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-green-600">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-8">
        <h2 className="text-lg font-bold">Alles was du brauchst</h2>
        <div className="mt-4 flex flex-col gap-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border">
              <CardContent className="flex items-start gap-4 py-4">
                <span className="text-3xl">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-5 mb-6 rounded-xl bg-green-600 px-5 py-8 text-center text-white">
        <h2 className="text-xl font-bold">Bereit loszulegen?</h2>
        <p className="mt-2 text-sm text-green-100">
          Werde Teil der GreenLog Community.
        </p>
        <Link href="/login">
          <Button className="mt-5 bg-white text-green-700 hover:bg-green-50 h-11 w-full text-base">
            Jetzt registrieren
          </Button>
        </Link>
      </section>
    </div>
  );
}
