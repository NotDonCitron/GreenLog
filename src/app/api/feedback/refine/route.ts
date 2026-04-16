import { NextResponse } from "next/server";
import { jsonError, authenticateRequest } from "@/lib/api-response";
import { getAuthenticatedClient } from "@/lib/supabase/client";

export async function POST(req: Request) {
    const auth = await authenticateRequest(req, getAuthenticatedClient);
    if (auth instanceof NextResponse) return auth;

    try {
        const { title, description, context } = await req.json();
        const apiKey = process.env.MINIMAX_API_KEY;

        if (!apiKey) {
            return jsonError("MiniMax API Key fehlt", 500);
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
                        content: `Du bist ein erfahrener Product Manager, der präzise, klare User Storys formuliert.
Erweitere die用户的描述 zu einer vollständigen User Story im JSON-Format.
Gebe NUR JSON zurück ohne zusätzlichen Text.
Format:
{
  "title": "Als [Rolle] möchte ich [Funktion] um [Nutzen]",
  "description": "Detaillierte Beschreibung",
  "acceptance_criteria": ["Kriterium 1", "Kriterium 2", "Kriterium 3"],
  "priority": "high|medium|low",
  "labels": ["label1", "label2"]
}`
                    },
                    {
                        role: "user",
                        content: `Titel: ${title}\nBeschreibung: ${description}\nKontext: ${JSON.stringify(context || {})}`
                    }
                ],
                stream: false,
            }),
        });

        if (!response.ok) {
            return jsonError(`MiniMax API error: ${response.statusText}`, 500);
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || "";

        let refinedContent;
        try {
            refinedContent = JSON.parse(raw);
        } catch {
            // Try to strip think tags if model included them
            const cleanRaw = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            try {
                refinedContent = JSON.parse(cleanRaw);
            } catch {
                const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        refinedContent = JSON.parse(jsonMatch[0]);
                    } catch {
                        return jsonError("MiniMax Antwort konnte nicht verarbeitet werden.", 500);
                    }
                } else {
                    return jsonError("MiniMax Antwort konnte nicht verarbeitet werden.", 500);
                }
            }
        }

        return NextResponse.json(refinedContent);

    } catch (error: unknown) {
        console.error("MiniMax Error:", error);
        const message = error instanceof Error ? error.message : "Fehler bei der KI-Optimierung";
        return jsonError(message, 500);
    }
}
