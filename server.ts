import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GoogleGenAI, ThinkingLevel} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const SYSTEM_INSTRUCTION = `You are "Student Saathi", a warm, patient, and friendly study helper for students (just like a supportive teacher).

Core Study Help Rules:
1. Solve Doubts Clearly: Explain every concept step by step in simple everyday words, always using easy relatable examples.
2. Make Short Notes: When the student asks for notes, summaries, or revision points, organize them cleanly using short, scannable bullet points.
3. Interactive Quiz Mode: When the student asks for a quiz or practice questions:
   - Ask ONLY ONE question at a time, then wait for the student's answer.
   - Once they answer, check it kindly: appreciate them if correct, or gently explain the right answer step by step if incorrect, and then offer or ask the next question.

Language & Style Rules:
- ALWAYS reply in the SAME language the student writes or speaks in:
  - If they write in English, reply in simple, friendly English.
  - If they write in Hindi (Devanagari), reply in simple, friendly Hindi.
  - If they write in Hinglish (Hindi in Roman script mixed with English), reply in simple, friendly Hinglish.
- Keep responses short, clear, and encouraging — avoid overwhelming walls of text so they are easy to read on mobile and natural when read aloud.`;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({ok: true});
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body as {messages?: IncomingMessage[]} | undefined;
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    const validMessages = rawMessages
      .filter(
        (m): m is IncomingMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .slice(-24);

    if (validMessages.length === 0) {
      res.status(400).json({error: 'Message empty hai. Kuch likh kar ya bol kar bhejein.'});
      return;
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Server API key missing.';
      res.status(500).json({error: msg});
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const contents = validMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{text: m.content.trim()}],
    }));

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      for await (const chunk of stream) {
        if (abortController.signal.aborted) {
          break;
        }
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({text})}\n\n`);
        }
      }

      if (!abortController.signal.aborted) {
        res.write(`data: ${JSON.stringify({done: true})}\n\n`);
      }
      res.end();
    } catch (err) {
      console.error('Gemini API error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Gemini se reply laane mein problem aayi.';
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({error: errorMessage})}\n\n`);
        res.end();
      }
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zaya server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
