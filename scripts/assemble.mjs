import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

async function dirHasIndex(dirPath) {
  try {
    const s = await stat(join(dirPath, 'index.html'));
    return s.isFile();
  } catch {
    return false;
  }
}

function renderMarkdownToHtml(md, title) {
  const escape = (text) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false;
  let inTable = false;
  let inList = false;

  const formatInline = (raw) => {
    let s = escape(raw);
    s = s.replace(/`([^`]+)`/g, '<code class="mono" style="background:var(--cp-surface-soft);padding:2px 6px;border-radius:4px;border:1px solid var(--cp-border)">$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
      const fixedUrl = url.endsWith('.md') ? url.replace(/\.md$/, '.html').replace(/^\.\/docs\//, './') : url;
      return `<a href="${fixedUrl}">${label}</a>`;
    });
    return s;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inTable) { out.push('</tbody></table></div>'); inTable = false; }
      if (!inCode) {
        inCode = true;
        out.push('<pre class="mono" style="background:var(--cp-surface);border:1px solid var(--cp-border);border-radius:12px;padding:16px;overflow-x:auto;line-height:1.6"><code>');
      } else {
        inCode = false;
        out.push('</code></pre>');
      }
      continue;
    }
    if (inCode) {
      out.push(escape(line) + '\n');
      continue;
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        out.push('<div class="matrix-table-wrap"><table class="matrix-table"><thead><tr>');
        cells.forEach((c) => out.push(`<th>${formatInline(c)}</th>`));
        out.push('</tr></thead><tbody>');
      } else {
        out.push('<tr>');
        cells.forEach((c) => out.push(`<td>${formatInline(c)}</td>`));
        out.push('</tr>');
      }
      continue;
    } else if (inTable) {
      out.push('</tbody></table></div>');
      inTable = false;
    }

    if (/^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim())) {
      if (!inList) {
        inList = true;
        out.push('<ul style="line-height:1.8;color:var(--cp-text);padding-left:22px">');
      }
      const itemText = line.trim().replace(/^([-*]|\d+\.)\s+/, '');
      out.push(`<li style="margin-bottom:6px">${formatInline(itemText)}</li>`);
      continue;
    } else if (inList) {
      out.push('</ul>');
      inList = false;
    }

    if (line.startsWith('# ')) {
      out.push(`<h1>${formatInline(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2 style="margin-top:32px;border-bottom:1px solid var(--cp-border);padding-bottom:8px">${formatInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      out.push(`<h3 style="margin-top:22px">${formatInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('> ')) {
      out.push(`<blockquote style="margin:18px 0;padding:14px 20px;border-left:4px solid var(--cp-accent);background:var(--cp-surface);border-radius:0 12px 12px 0">${formatInline(line.slice(2))}</blockquote>`);
    } else if (line.trim() === '---') {
      out.push('<hr style="border:none;border-top:1px solid var(--cp-border);margin:28px 0">');
    } else if (line.trim().length > 0) {
      out.push(`<p style="line-height:1.8;color:var(--cp-text-muted)">${formatInline(line)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  if (inTable) out.push('</tbody></table></div>');
  if (inCode) out.push('</code></pre>');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(title)} · AI Gaming Lab</title>
  <script>
    (() => {
      const param = new URLSearchParams(window.location.search).get("scoutTheme");
      const theme =
        param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    })();
  </script>
  <link rel="stylesheet" href="../assets/theme.css">
</head>
<body>
<main class="shell">
  <nav class="topline">
    <a class="button" href="../">← 返回 AI Gaming Lab 门户</a>
    <div class="topline-actions">
      <a class="button" href="../demos/wanan-midnight/">湾岸 Midnight →</a>
      <a class="button" href="../demos/scrap-swarm/">Scrap Swarm →</a>
    </div>
  </nav>
  <article style="margin-top:28px">
    ${out.join('\n')}
  </article>
  <footer>
    <span>AI Gaming &amp; Procedural Animation Lab · 技术资产白皮书</span>
    <a href="../">返回门户首页</a>
  </footer>
</main>
</body>
</html>`;
}

await mkdir('dist/assets', { recursive: true });
await cp('assets/theme.css', 'dist/assets/theme.css');

await mkdir('dist/research', { recursive: true });
await cp('docs', 'dist/research', { recursive: true });

for (const file of await readdir('docs')) {
  if (!file.endsWith('.md')) continue;
  const raw = await readFile(join('docs', file), 'utf8');
  const firstHeading = raw.split(/\r?\n/).find((l) => l.startsWith('# '))?.slice(2) || file;
  const html = renderMarkdownToHtml(raw, firstHeading);
  await writeFile(join('dist/research', file.replace(/\.md$/, '.html')), html, 'utf8');
}

// Sync wanan-midnight demo into public/demos/wanan-midnight and dist/demos/wanan-midnight
const wananCandidates = [
  process.env.WANAN_DIST_DIR,
  resolve('../wanan-midnight/dist'),
  resolve('../copilot-worktrees/wanan-midnight/turbo998-expert-train/dist'),
  resolve('public/demos/wanan-midnight'),
].filter(Boolean);

await mkdir('dist/demos/wanan-midnight', { recursive: true });
let wananCopied = false;
for (const candidate of wananCandidates) {
  if (candidate && existsSync(candidate) && (await dirHasIndex(candidate))) {
    if (resolve(candidate) !== resolve('public/demos/wanan-midnight')) {
      await mkdir('public/demos/wanan-midnight', { recursive: true });
      await cp(candidate, 'public/demos/wanan-midnight', { recursive: true });
    }
    await cp(candidate, 'dist/demos/wanan-midnight', { recursive: true });
    console.log(`Synced wanan-midnight demo from: ${candidate}`);
    wananCopied = true;
    break;
  }
}

// Sync scrap-swarm demo into public/demos/scrap-swarm and dist/demos/scrap-swarm
const scrapCandidates = [
  process.env.SCRAP_DIST_DIR,
  resolve('../scrap-swarm/dist'),
  resolve('public/demos/scrap-swarm'),
].filter(Boolean);

await mkdir('dist/demos/scrap-swarm', { recursive: true });
let scrapCopied = false;
for (const candidate of scrapCandidates) {
  if (candidate && existsSync(candidate) && (await dirHasIndex(candidate))) {
    if (resolve(candidate) !== resolve('public/demos/scrap-swarm')) {
      await mkdir('public/demos/scrap-swarm', { recursive: true });
      await cp(candidate, 'public/demos/scrap-swarm', { recursive: true });
    }
    await cp(candidate, 'dist/demos/scrap-swarm', { recursive: true });
    console.log(`Synced scrap-swarm demo from: ${candidate}`);
    scrapCopied = true;
    break;
  }
}

await cp('LICENSE', 'dist/LICENSE.txt');
await cp('THIRD_PARTY_NOTICES.md', 'dist/THIRD_PARTY_NOTICES.md');
await writeFile('dist/.nojekyll', '');
console.log(`Assembled AI Gaming Lab portal (wanan=${wananCopied}, scrap=${scrapCopied}).`);
