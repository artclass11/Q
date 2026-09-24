import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { queryProject } from "./core/engine.js";

const MAX_BODY = 256 * 1024;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("content-length", Buffer.byteLength(payload));
  response.end(payload);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY) throw new Error("request body too large");
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function startServer(root = process.cwd(), port = 7319): void {
  const absoluteRoot = path.resolve(root);
  const remote = process.env.Q_ALLOW_REMOTE === "1";
  const host = remote ? "0.0.0.0" : "127.0.0.1";

  if (remote) console.warn("Q_ALLOW_REMOTE=1 exposes the server beyond localhost. Add authentication first.");

  const server = createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, { ok: true, root: absoluteRoot });
        return;
      }

      if (request.method === "POST" && request.url === "/query") {
        const body = await readJson(request);
        if (typeof body !== "object" || body === null) {
          sendJson(response, 400, { error: "body must be a JSON object" });
          return;
        }

        const question = (body as { question?: unknown }).question;
        const topK = (body as { topK?: unknown }).topK;

        if (typeof question !== "string" || question.trim().length === 0) {
          sendJson(response, 400, { error: "question is required" });
          return;
        }

        const pack = await queryProject(
          absoluteRoot,
          question.trim(),
          typeof topK === "number" ? { topK: Math.min(Math.max(1, Math.floor(topK)), 32) } : {}
        );

        sendJson(response, 200, pack);
        return;
      }

      sendJson(response, 404, { error: "not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      sendJson(response, 400, { error: message });
    }
  });

  server.listen(port, host, () => {
    console.log("Q server listening on http://" + host + ":" + String(port));
  });
}
