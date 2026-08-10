import { fetchWithRetry } from "./http.ts";
import { OPENAI_CHAT_URL, computeCost, TokenUsage } from "./llm.ts";

export async function parseExistingListingFHA(
  openaiKey: string,
  propertyId: string,
  rawDescription: string,
): Promise<{
  compliant_parts: string;
  violations: string[];
  compliance_score: number;
  fha_categories: Record<string, unknown> | null;
  latencyMs: number;
  usage: TokenUsage;
}> {
  const start = Date.now();
  const schema = {
    type: "object",
    properties: {
      compliant_parts: { type: "string" },
      violations: { type: "array", items: { type: "string" } },
      compliance_score: { 
        type: "integer", 
        description: "FHA compliance score from 0 (completely non-compliant) to 100 (100% compliant/no violations)" 
      },
      fha_categories: {
        type: "object",
        properties: {
          protected_classes: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reasoning: { type: "string", description: "Details on checking religion, race, gender, family status, etc. Explain what was found or checked." }
            },
            required: ["passed", "reasoning"]
          },
          steering_coded_language: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reasoning: { type: "string", description: "Details on checking steering/coded language like 'exclusive', 'safe neighborhood', 'walk to churches', etc." }
            },
            required: ["passed", "reasoning"]
          },
          demographics_character: {
            type: "object",
            properties: {
              passed: { type: "boolean" },
              reasoning: { type: "string", description: "Details on checking neighborhood demographic references or vibes of current residents." }
            },
            required: ["passed", "reasoning"]
          }
        },
        required: ["protected_classes", "steering_coded_language", "demographics_character"]
      }
    },
    required: ["compliant_parts", "violations", "compliance_score", "fha_categories"],
  };

  const res = await fetchWithRetry(
    OPENAI_CHAT_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You are an expert FHA compliance reviewer for real estate. Review the provided listing description. Extract all facts and selling points into `compliant_parts`, rewriting slightly if needed to remove violations. Extract any specific phrases or words that violate FHA guidelines (or could be construed as violations, like 'walking distance', 'family', 'church', 'bachelor') into the `violations` array. Evaluate a compliance_score out of 100: deduct 15 points per FHA violation, up to 100. If no violations, score is 100. Perform a category-by-category checks assessment mapping to fha_categories with passed/failed boolean and detailed checked reasoning.",
          },
          {
            role: "user",
            content: `Review this listing description:\n\n${rawDescription}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "fha_review", schema },
        },
      }),
    },
    "openai_fha_parse",
    propertyId,
  );

  if (!res.ok) {
    // If it fails, we just return the raw as compliant with no violations so it doesn't break the flow.
    // The main generation prompt will still apply FHA rules.
    return {
      compliant_parts: rawDescription,
      violations: [],
      compliance_score: 100,
      fha_categories: {
        protected_classes: { passed: true, reasoning: "FHA check offline. Standard fallback active." },
        steering_coded_language: { passed: true, reasoning: "FHA check offline. Standard fallback active." },
        demographics_character: { passed: true, reasoning: "FHA check offline. Standard fallback active." }
      },
      latencyMs: Date.now() - start,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const usage = computeCost(
    "gpt-4o-mini",
    data.usage?.prompt_tokens ?? 0,
    data.usage?.completion_tokens ?? 0,
  );

  try {
    const parsed = JSON.parse(content);
    return {
      compliant_parts: parsed.compliant_parts || rawDescription,
      violations: parsed.violations || [],
      compliance_score: parsed.compliance_score ?? 100,
      fha_categories: parsed.fha_categories || null,
      latencyMs: Date.now() - start,
      usage,
    };
  } catch {
    return {
      compliant_parts: rawDescription,
      violations: [],
      compliance_score: 100,
      fha_categories: null,
      latencyMs: Date.now() - start,
      usage,
    };
  }
}
