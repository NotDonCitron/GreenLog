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
Deine Aufgabe ist es, vage oder kurze Feedback-Texte von Testern in präzise, technische Ticket-Beschreibungen umzuformulieren.
Regeln:
- title: Maximal 10 Wörter, deskriptiv, klar
- description: 2-4 Sätze, enthält WAS passiert ist und WO (URL/Seite)
- Ändere NIEMALS die ursprüngliche Bedeutung
- Wenn das Feedback bereits präzise ist, gib leicht verbesserte Version aus
Antworte NUR mit JSON im Format: { "title": "...", "description": "..." }`
          },
          {
            role: "user",
            content: `Feedback: "${description}"
Titel-Vorschlag: "${title}"
Seite: ${context?.pathname || "/"}
User: ${context?.userId || "unbekannt"}`
          }
        ]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("MiniMax API error:", result);
      return NextResponse.json({ error: result.error?.message || "MiniMax Fehler" }, { status: 500 });
    }

    console.log("MiniMax raw response:", JSON.stringify(result, null, 2));

    let refinedContent = { title, description };

    if (result.choices?.[0]?.message?.content) {
      const raw = result.choices[0].message.content;
      try {
        refinedContent = JSON.parse(raw);
      } catch {
        console.error("Failed to parse MiniMax response as JSON:", raw);
        return NextResponse.json({ title, description });
      }
    }

    return NextResponse.json(refinedContent);
  } catch (error: any) {
    console.error("MiniMax Error:", error);
    return NextResponse.json({ error: error.message || "Fehler bei der KI-Optimierung" }, { status: 500 });
  }
}
