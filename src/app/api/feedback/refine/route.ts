import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, description, context } = await req.json();
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "MiniMax API Key fehlt" }, { status: 500 });
    }

    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2",
        messages: [
          {
            role: "system",
            content: `Du bist ein erfahrener QA-Ingenieur für das Projekt 'GreenLog'.
Deine Aufgabe: Vage oder kurze Feedback-Texte von Testern in vollständige, professionelle Ticket-Beschreibungen umwandeln.
Format: { "title": "max 10 Wörter, prägnant", "description": "2-4 Sätze WAS + WO + GESCHEHEN" }
WICHTIG: Entferne keine Informationen, ergänze fehlende Details sinnvoll.
Zielgruppe: Entwickler (Claude Code) der das Ticket umsetzen muss.`
          },
          {
            role: "user",
            content: `Feedback: "${description}"
Titel: "${title}"
Seite: ${context?.pathname || "/"}`
          }
        ]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("MiniMax API error:", result);
      return NextResponse.json({ error: result.error?.message || "MiniMax Fehler" }, { status: 500 });
    }

    let refinedContent = { title, description };

    const raw = result.choices?.[0]?.message?.content;
    if (raw && typeof raw === "string") {
      // MiniMax-M2 includes thinking tokens (<think>...</think>) - strip them
      const cleanRaw = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      try {
        refinedContent = JSON.parse(cleanRaw);
      } catch (e) {
        // If still invalid, try to extract JSON from the text
        const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            refinedContent = JSON.parse(jsonMatch[0]);
          } catch {
            return NextResponse.json({ error: "MiniMax Antwort konnte nicht verarbeitet werden." }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: "MiniMax Antwort konnte nicht verarbeitet werden." }, { status: 500 });
        }
      }
    }

    return NextResponse.json(refinedContent);
  } catch (error: any) {
    console.error("MiniMax Error:", error);
    return NextResponse.json({ error: error.message || "Fehler bei der KI-Optimierung" }, { status: 500 });
  }
}
