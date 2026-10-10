
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }

    const systemMessage = messages.find(
      message => message.role === "system"
    );

    const contents = messages
      .filter(message =>
        message.role === "user" ||
        message.role === "assistant"
      )
      .map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.content || "") }]
      }));

    if (!contents.length) {
      return res.status(400).json({
        error: "No user messages provided"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: systemMessage
            ? {
                parts: [{ text: String(systemMessage.content || "") }]
              }
            : undefined,
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data.error?.message);

      return res.status(response.status).json({
        error: data.error?.message || "Gemini API request failed"
      });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    return res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: reply
          }
        }
      ]
    });
  } catch (error) {
    console.error("Chat request failed:", error.message);

    return res.status(500).json({
      error: "Could not connect to Gemini"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Obanai server listening on port ${PORT}`);
});
