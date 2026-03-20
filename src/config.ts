import "dotenv/config";

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: "claude-sonnet-4-20250514" as const,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-image-1" as const,
  },
  brand: {
    name: process.env.BRAND_NAME || "Jin Yong Duomo",
    style: process.env.BRAND_STYLE || "elegant modern Chinese restaurant, red and gold accents, dark wood, warm lighting",
    mood: process.env.BRAND_MOOD || "luxurious, inviting, authentic yet contemporary",
  },
};
