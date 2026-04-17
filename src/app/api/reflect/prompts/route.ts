import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { arabicText, translationText, tafsirSummary, userQuery } = await req.json();

  if (!translationText) {
    return NextResponse.json({ error: "translationText is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    // Return thoughtful fallback prompts when no API key
    return NextResponse.json({
      prompts: [
        "How does the message of this verse relate to something you are currently experiencing in your life?",
        "What is one thing you can do today to live more in alignment with the guidance in this verse?",
        "If you were to speak to Allah about this verse, what would you say? What would you ask for?",
      ],
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `You are a thoughtful Islamic reflection guide. Your role is to help Muslims engage in
tadabbur (deep contemplation) of Quranic verses. Generate 3 reflection prompts that:

1. Are deeply personal and introspective — make the reader pause and think about their own life
2. Connect the verse's meaning to real, everyday situations
3. Vary in type: one for self-examination, one for gratitude or action, one for du'a or conversation with Allah
4. Are warm, gentle, and non-judgmental in tone
5. Are concise (1-2 sentences each)
6. NEVER give scholarly tafsir, fatwa, or fiqh rulings — you prompt reflection, not teaching
7. Respect the verse's context and scholarly understanding provided in the tafsir
8. If the user arrived via a personal query, subtly connect prompts to their situation

Respond ONLY with a JSON array of 3 strings. No preamble, no markdown.
Example: ["prompt 1", "prompt 2", "prompt 3"]`,
        messages: [
          {
            role: "user",
            content: `Verse (Arabic): ${arabicText || ""}
Translation: ${translationText}
Tafsir summary: ${tafsirSummary || "Not available"}
User's context: ${userQuery || "General reflection"}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", await response.text());
      return NextResponse.json({
        prompts: [
          "How does the message of this verse relate to something you are currently experiencing in your life?",
          "What is one thing you can do today to live more in alignment with the guidance in this verse?",
          "If you were to speak to Allah about this verse, what would you say? What would you ask for?",
        ],
      });
    }

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, "").trim();
    const prompts = JSON.parse(text);

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Reflection prompts error:", error);
    return NextResponse.json({
      prompts: [
        "How does the message of this verse relate to something you are currently experiencing in your life?",
        "What is one thing you can do today to live more in alignment with the guidance in this verse?",
        "If you were to speak to Allah about this verse, what would you say? What would you ask for?",
      ],
    });
  }
}
