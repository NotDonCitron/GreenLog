import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, description, context } = await req.json();
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "MiniMax API Key fehlt" }, { status: 500 });
    }

    // Wir nutzen das MiniMax-Modell, um das Ticket professionell zu formulieren
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "abab6.5-chat", // Oder dein bevorzugtes MiniMax Modell
        messages: [
          {
            role: "system",
            content: `Du bist ein erfahrener QA-Ingenieur für das Projekt 'GreenLog'. 
            Deine Aufgabe ist es, unstrukturiertes Feedback von Testern in ein präzises, technisches Ticket für einen Entwickler (Claude Code) umzuformulieren.
            
            Nutze den mitgelieferten Kontext (URL, Browser, etc.), um das Ticket anzureichern.
            Antworte NUR mit dem optimierten JSON-Objekt im Format:
            { "title": "...", "description": "..." }`
          },
          {
            role: "user",
            content: `User Feedback: "${description}" (Titel: ${title})
            Kontext: ${JSON.stringify(context)}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const result = await response.json();
    const refinedContent = JSON.parse(result.choices[0].message.content);

    return NextResponse.json(refinedContent);
  } catch (error: any) {
    console.error("MiniMax Error:", error);
    return NextResponse.json({ error: "Fehler bei der KI-Optimierung" }, { status: 500 });
  }
}
