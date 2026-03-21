import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { config } from "./config.js";

export class PhotoAgent {
  private genAI: GoogleGenerativeAI;
  private openai: OpenAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async analyzeAndGeneratePrompts(photoBuffer: Buffer, description: string): Promise<string[]> {
    const base64Image = photoBuffer.toString("base64");
    const mediaType = "image/jpeg";

    const systemPrompt = `You are an expert food photographer and art director for "${config.brand.name}".
Brand style: ${config.brand.style}
Brand mood: ${config.brand.mood}

Your task: analyze the provided dish photo and generate 6 DIFFERENT professional photography prompts.
Each prompt must produce a DISTINCT visual style while keeping the SAME dish.

The 6 styles must be:
1. HERO SHOT - dramatic angle, shallow depth of field, steam/motion
2. CLOSE-UP DETAIL - macro-style, texture focus, ingredient details
3. TABLE SETTING - full table context, chopsticks, tea, ambient restaurant setting
4. ACTION SHOT - pouring sauce, breaking apart, lifting with chopsticks
5. MINIMALIST - clean background, centered, editorial magazine style
6. WARM AMBIENT - cozy restaurant lighting, bokeh background, evening mood

Return ONLY a JSON array of 6 strings (the prompts), nothing else.`;

    const model = this.genAI.getGenerativeModel({ model: config.gemini.model });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: mediaType, data: base64Image } },
          { text: `${systemPrompt}\n\nDish: ${description}\n\nGenerate 6 professional food photography prompts for this dish.` },
        ],
      }],
    });

    const text = result.response.text();
    const jsonMatch = text.match(/\[([\s\S]*?)\]/);
    if (!jsonMatch) throw new Error("Gemini did not return valid JSON prompts");
    return JSON.parse(jsonMatch[0]);
  }

  async generateImage(prompt: string, referencePhoto: Buffer): Promise<Buffer> {
    const uint8 = new Uint8Array(referencePhoto);
    const file = new File([uint8], "reference.png", { type: "image/png" });

    const response = await this.openai.images.edit({
      model: config.openai.model,
      image: file,
      prompt: `${prompt}\n\nIMPORTANT: Keep the SAME dish and ingredients. Enhance presentation, lighting, and styling to professional food photography standards.`,
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data?.[0];
    if (!imageData) throw new Error("OpenAI did not return image data");
    if (imageData.b64_json) return Buffer.from(imageData.b64_json, "base64");
    if (imageData.url) {
      const imgRes = await fetch(imageData.url);
      return Buffer.from(await imgRes.arrayBuffer());
    }
    throw new Error("OpenAI returned empty image data");
  }
}
