import { validateRequest } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, style } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // Fallback captions if API key is not configured
      const fallbacks: Record<string, string[]> = {
        professional: [
          `Excited to share this update! ${content}`,
          `Reflecting on progress and next steps. ${content}`,
          `Insights from today's work. ${content}`
        ],
        funny: [
          `Tears of joy or exhaustion? You decide. 😂 ${content}`,
          `Plot twist: it actually worked. 🎬 ${content}`,
          `Normal is boring. Let's be weird. ${content}`
        ],
        viral: [
          `This is going to change everything. Agree or disagree? ⚡ ${content}`,
          `The secret is finally out! 🚀 ${content}`,
          `Drop a 🔥 if you agree! ${content}`
        ],
        startup: [
          `Building in public: the daily hustle. 💻 ${content}`,
          `Validate fast, ship faster. 🚀 ${content}`,
          `Zero to one. Let's scale! 📈 ${content}`
        ],
        travel: [
          `Wanderlust mode: ON. 🌍 ${content}`,
          `Collect moments, not things. 📸 ${content}`,
          `Another beautiful destination checked. ✈️ ${content}`
        ],
        default: [
          `Grateful for the journey. ${content}`,
          `Current vibes. ⚡ ${content}`,
          `Focused on the future. 🚀 ${content}`
        ]
      };
      const captions = fallbacks[style?.toLowerCase()] || fallbacks.default;
      return NextResponse.json({ captions });
    }

    const systemPrompt = `You are a creative social media manager. Generate exactly 3 alternative post captions based on the user's input content: "${content}". The style must be: "${style}". Return them as a simple list separated by double newlines. Do not add numbering, bullet points, introductory text, quotes, or markdown. Just the captions.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Cartly Creator Studio"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: systemPrompt
          }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";
    
    // Parse captions split by double newlines
    const captions = reply
      .split("\n\n")
      .map((c: string) => c.trim().replace(/^["']|["']$/g, ""))
      .filter((c: string) => c.length > 0)
      .slice(0, 3);

    // Fallback parsing split by single newlines if double newlines wasn't used
    if (captions.length < 2) {
      const lines = reply
        .split("\n")
        .map((c: string) => c.trim().replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, ""))
        .filter((c: string) => c.length > 0)
        .slice(0, 3);
      if (lines.length > 0) {
        return NextResponse.json({ captions: lines });
      }
    }

    return NextResponse.json({ captions: captions.length > 0 ? captions : [`Current vibes! ${content}`] });
  } catch (error: any) {
    console.error("Error in AI caption route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
