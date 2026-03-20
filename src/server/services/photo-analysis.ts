import { db } from "@/server/lib/db";

/**
 * Analyze a damage photo using GPT-4o Vision.
 * Returns a severity score (1-10) and structured analysis.
 *
 * In production, this is called as a background job (Trigger.dev)
 * after a photo is uploaded via MMS or the dashboard.
 */
export async function analyzePhoto(photoId: string): Promise<{
  severityScore: number;
  severityNotes: string;
  analysisJson: Record<string, unknown>;
}> {
  const photo = await db.photo.findUnique({
    where: { id: photoId },
    include: { call: { select: { emergencyType: true, squareFootage: true } } },
  });

  if (!photo) throw new Error(`Photo not found: ${photoId}`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[Photo Analysis] OPENAI_API_KEY not set — using stub");
    return stubAnalysis(photo.call.emergencyType);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert restoration damage assessor. Analyze the photo and return a JSON object with:
- severityScore: integer 1-10 (1=minor cosmetic, 5=moderate structural, 10=catastrophic)
- damageType: one of "water_damage", "fire_smoke", "mold", "storm", "sewage", "structural", "unknown"
- extent: "minor", "moderate", "significant", "severe", "catastrophic"
- estimatedSqFt: rough estimate of affected area in the photo
- materials: array of affected materials visible (e.g. ["drywall", "carpet", "hardwood", "tile"])
- recommendations: array of immediate actions needed (e.g. ["immediate_extraction", "dehumidification"])
- notes: 1-2 sentence professional assessment

Respond ONLY with valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: photo.storageUrl, detail: "high" },
              },
              {
                type: "text",
                text: `Assess this restoration damage photo. Known context: ${photo.call.emergencyType ?? "unknown type"}, reported ~${photo.call.squareFootage ?? "unknown"} sq ft.`,
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const analysis = JSON.parse(content.replace(/```json\n?|```/g, "").trim());

    const result = {
      severityScore: Math.min(10, Math.max(1, analysis.severityScore ?? 5)),
      severityNotes: analysis.notes ?? "Analysis completed.",
      analysisJson: analysis,
    };

    // Update photo record
    await db.photo.update({
      where: { id: photoId },
      data: result,
    });

    return result;
  } catch (error) {
    console.error("[Photo Analysis] Error:", error);
    return stubAnalysis(photo.call.emergencyType);
  }
}

function stubAnalysis(emergencyType: string | null) {
  return {
    severityScore: 5,
    severityNotes: "Photo analysis unavailable — using default severity estimate.",
    analysisJson: {
      damageType: emergencyType?.toLowerCase() ?? "unknown",
      extent: "moderate",
      stub: true,
    },
  };
}
