// Local FamJam server: the built app + the real API with an in-memory database.
// Used for the multi-phone walkthrough. Usage: npx tsx scripts/dev-server.ts [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { makeTestServer } from '../server/testkit';
import { handle } from '../server/handlers';
import { DECKS } from '../src/lib/decks';

const port = Number(process.argv[2] ?? 4180);
const { deps, sent } = makeTestServer();
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png' };

createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  if (path === '/__test/sent') { res.end(JSON.stringify(sent)); return; }
  if (path === '/__test/card' && req.method === 'POST') {
    // Test-only (this local server only): give someone a specific card, so the walkthrough isn't left to chance.
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const { player, withName, cardId } = JSON.parse(raw);
    for (const id of await deps.store.familyIds()) {
      const fam = (await deps.store.getFamily(id))!;
      const p = fam.doc.members.find((m) => m.name === player);
      const w = fam.doc.members.find((m) => m.name === withName);
      if (!p || !w) continue;
      const [wedge, card] = Object.entries(DECKS).flatMap(([k, d]) => d.map((c) => [k, c] as const)).find(([, c]) => c.id === cardId)!;
      const text = (p.age === 'child' ? card.child : card.adult).replace(/\{member\}/g, w.name);
      p.currentCard = { cardId, wedge: wedge as any, type: card.type, text, withMemberId: w.id, status: 'todo' };
      p.lastRollDate = undefined;
      await deps.store.saveFamily(fam.doc, fam.version);
    }
    res.end('{}');
    return;
  }
  if (path.startsWith('/api/')) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
    const out = await handle({ method: req.method ?? 'GET', path: path.replace(/\/$/, ''), headers: req.headers as any, body, ip: '127.0.0.1' }, deps);
    res.writeHead(out.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out.body));
    return;
  }
  const file = normalize(join('dist', path === '/' ? 'index.html' : path));
  try {
    if (!file.startsWith('dist')) throw new Error('bad path');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(await readFile('dist/index.html'));
  }
}).listen(port, () => console.log(`FamJam dev server on http://localhost:${port}`));
