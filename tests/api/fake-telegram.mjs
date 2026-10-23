#!/usr/bin/env node
/**
 * fake-telegram.mjs — локальный двойник Telegram Bot API для API-тестов.
 *
 * POST /bot<token>/sendMessage — записывает сообщение и отвечает успехом,
 * кроме chat_id, начинающегося с `fail` (тогда 500 — проверка 502).
 * GET /messages — список принятых сообщений; DELETE /messages — очистка.
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_TG_PORT ?? 4326);
const HOST = process.env.FAKE_TG_HOST ?? '127.0.0.1';

/** @type {Array<{chatId: string, text: string, parseMode: string}>} */
const messages = [];

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);

  if (request.method === 'GET' && url.pathname === '/messages') {
    sendJson(response, 200, messages);
    return;
  }

  if (request.method === 'DELETE' && url.pathname === '/messages') {
    messages.length = 0;
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && /^\/bot[^/]+\/sendMessage$/.test(url.pathname)) {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const params = new URLSearchParams(body);
      const chatId = params.get('chat_id') ?? '';
      const text = params.get('text') ?? '';
      const parseMode = params.get('parse_mode') ?? '';

      messages.push({ chatId, text, parseMode });

      if (chatId.startsWith('fail')) {
        sendJson(response, 500, { ok: false, description: 'forced failure' });
        return;
      }

      sendJson(response, 200, { ok: true, result: { message_id: messages.length } });
    });
    return;
  }

  sendJson(response, 404, { ok: false, description: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[fake-telegram] listening on http://${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
