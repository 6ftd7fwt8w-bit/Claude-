// Empaqueta la web compilada (dist/) en un solo HTML para publicarla como página privada de Claude,
// y así probar Sereno en el móvil sin instalar nada.  Uso: npm run build && node scripts/build-artifact.mjs salida.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const out = process.argv[2] ?? join(dist, 'sereno-artifact.html');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const css = /href="\.\/(assets\/[^"]+\.css)"/.exec(html)?.[1];
const js = /src="\.\/(assets\/[^"]+\.js)"/.exec(html)?.[1];
if (!css || !js) throw new Error('No encuentro los archivos compilados en dist/');
const style = readFileSync(join(dist, css), 'utf8');
const script = readFileSync(join(dist, js), 'utf8').replace(/<\/script/gi, '<\\/script');

writeFileSync(
  out,
  `<title>Sereno</title>
<meta name="theme-color" content="#EEF3EC" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`,
);
console.log(`Artifact listo: ${out} (${Math.round((style.length + script.length) / 1024)} KB)`);
