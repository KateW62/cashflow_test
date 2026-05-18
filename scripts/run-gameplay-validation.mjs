import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const outfile = '/private/tmp/cashflow-gameplay-validation.mjs';

await build({
  entryPoints: ['scripts/gameplay-validation.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

await import(pathToFileURL(outfile).href);
