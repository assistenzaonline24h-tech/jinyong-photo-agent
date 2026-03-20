import { Bot, InputFile } from "grammy";
import { PhotoAgent } from "./photo-agent.js";
import { config } from "./config.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export function startTelegramBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("No TELEGRAM_BOT_TOKEN set, skipping Telegram bot");
    return;
  }

  const bot = new Bot(TELEGRAM_BOT_TOKEN);
  const agent = new PhotoAgent();

  bot.command("start", (ctx) => {
    ctx.reply(
      "Benvenuto nel Photo Agent di " + config.brand.name + "!\n\n" +
      "Inviami una foto di un piatto con una descrizione e generer\u00f2 6 varianti professionali.\n\n" +
      "Esempio: invia una foto e scrivi \"Ravioli al vapore con salsa di soia\""
    );
  });

  bot.on("message:photo", async (ctx) => {
    const caption = ctx.message.caption || "Piatto del ristorante";
    
    await ctx.reply("Analizzo la foto e genero 6 varianti professionali... Attendi circa 1-2 minuti.");

    try {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const prompts = await agent.analyzeAndGeneratePrompts(buffer, caption);
      
      await ctx.reply("Ho generato " + prompts.length + " prompt. Ora creo le immagini...");

      let successCount = 0;
      for (const prompt of prompts) {
        try {
          const imageUrl = await agent.generateImage(buffer, prompt);
          if (imageUrl) {
            await ctx.replyWithPhoto(imageUrl, { caption: prompt.substring(0, 200) });
            successCount++;
          }
        } catch (err) {
          console.error("Error generating image:", err);
        }
      }

      await ctx.reply("Completato! " + successCount + "/" + prompts.length + " foto generate.");
    } catch (error) {
      console.error("Telegram bot error:", error);
      await ctx.reply("Errore durante la generazione. Riprova pi\u00f9 tardi.");
    }
  });

  bot.on("message:text", (ctx) => {
    if (!ctx.message.reply_to_message?.photo) {
      ctx.reply("Inviami una foto di un piatto con una descrizione nella didascalia!");
    }
  });

  bot.start();
  console.log("Telegram bot started for " + config.brand.name);
}
