import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Step 1 test endpoint: proves the backend can successfully reach the AI model.
app.post("/api/test", async (req, res) => {
  const { prompt } = req.body as { prompt?: string };

  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  try {
    const result = await model.generateContent(prompt);
    res.json({ reply: result.response.text() });
  } catch (error) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({ error: "Failed to get a response from the AI model" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Negotiation backend listening on http://localhost:${port}`);
});
