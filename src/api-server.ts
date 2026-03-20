import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config.js";
import { PhotoAgent } from "./photo-agent.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const agent = new PhotoAgent();

app.use(cors({ origin: true, methods: ["POST", "GET"] }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", brand: config.brand.name, timestamp: new Date().toISOString() });
});

app.post("/api/generate-photos", upload.single("photo"), async (req, res) => {
  try {
    const file = req.file;
    const description = req.body?.description;
    const category = req.body?.category || "";

    if (!file) { res.status(400).json({ error: "Nessuna foto caricata" }); return; }
    if (!description || description.trim().length < 3) { res.status(400).json({ error: "Descrizione troppo corta" }); return; }

    console.log("New request:", description, "[" + category + "]");

    const fullDesc = category ? description + " (categoria: " + category + ")" : description;
    const prompts = await agent.analyzeAndGeneratePrompts(file.buffer, fullDesc);
    console.log("Generated", prompts.length, "prompts");

    const photos: { url: string; prompt: string }[] = [];
    for (let i = 0; i < prompts.length; i += 3) {
      const batch = prompts.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (prompt) => {
          const buf = await agent.generateImage(prompt, file.buffer);
          return { url: "data:image/png;base64," + buf.toString("base64"), prompt };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") photos.push(r.value);
        else console.error("Image gen failed:", r.reason);
      }
    }

    if (photos.length === 0) { res.status(500).json({ error: "Nessuna immagine generata" }); return; }
    console.log("Generated", photos.length, "/", prompts.length, "photos");
    res.json({ photos, description, category });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Errore interno" });
  }
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log("Jin Yong Duomo Photo Agent API on port", PORT);
});
