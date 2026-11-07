// Bundles the server into self-contained Vercel functions in /api (one small file per route).
import { build } from 'esbuild';
import { mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';

const ROUTES = ['config', 'family', 'join', 'state', 'action', 'invite', 'push', 'cron-nudges'];
mkdirSync('api', { recursive: true });
for (const f of readdirSync('api')) rmSync(`api/${f}`);
await build({
  entryPoints: ['server/vercel.ts'],
  outfile: '.api-bundle.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: true,
  legalComments: 'none',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
for (const r of ROUTES) copyFileSync('.api-bundle.js', `api/${r}.js`);
rmSync('.api-bundle.js');
console.log(`Built ${ROUTES.length} API functions in /api`);
