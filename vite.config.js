import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// <!-- @parts js src/js --> / <!-- @parts css src/css --> склеивают файлы папки по порядку имён
function parts() {
  return {
    name: 'parts',
    transformIndexHtml(html) {
      return html.replace(/<!--\s*@parts\s+(js|css)\s+(\S+)\s*-->/g, (_, kind, dir) => {
        const ext = '.' + kind;
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort();
        const body = files.map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
        return kind === 'js' ? `<script>\n${body}\n</script>` : `<style>\n${body}\n</style>`;
      });
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/')) server.ws.send({ type: 'full-reload' });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [parts()],
  define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || 'dev') },
  build: { outDir: 'www', emptyOutDir: true, assetsInlineLimit: 0 }
});
