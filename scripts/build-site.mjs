import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const FIGURES = join(ROOT, "figures");
const TEMPLATE = join(ROOT, "gallery", "template.html");
const OUT = join(ROOT, "_site");

const THEMES = [
  { flag: null, file: "index.html" },
  { flag: "--light", file: "index-light.html" },
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function figureDirs() {
  if (!existsSync(FIGURES)) return [];
  return readdirSync(FIGURES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(join(FIGURES, slug, "build.mjs")))
    .sort();
}

function readMeta(slug) {
  const path = join(FIGURES, slug, "figure.json");
  const meta = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  return { slug, project: "", title: slug, blurb: "", prompt: "", order: 0, ...meta };
}

function buildFigure(slug) {
  const dir = join(FIGURES, slug);
  for (const { flag } of THEMES) {
    const args = ["build.mjs", ...(flag ? [flag] : [])];
    const result = spawnSync(process.execPath, args, { cwd: dir, stdio: "inherit" });
    if (result.status !== 0) {
      throw new Error(`build failed: figures/${slug}/build.mjs${flag ? ` ${flag}` : ""}`);
    }
  }
}

function stageFigure(slug) {
  const from = join(FIGURES, slug);
  const to = join(OUT, slug);
  mkdirSync(to, { recursive: true });
  for (const { file } of THEMES) {
    const source = join(from, file);
    if (!existsSync(source)) {
      throw new Error(`missing output: figures/${slug}/${file} (build.mjs must write it)`);
    }
    cpSync(source, join(to, file));
  }
}

function card(meta) {
  const href = `${meta.slug}/index.html`;
  const lightHref = `${meta.slug}/index-light.html`;
  const prompt = meta.prompt
    ? `<details class="prompt"><summary>Prompt</summary><p>${escapeHtml(meta.prompt)}</p></details>`
    : "";
  const blurb = meta.blurb ? `<p class="blurb">${escapeHtml(meta.blurb)}</p>` : "";
  return `      <article class="card">
        <a class="open" href="${href}">
          <h3>${escapeHtml(meta.title)}</h3>
        </a>
        ${blurb}
        ${prompt}
        <p class="links"><a href="${href}">Open</a><span>·</span><a href="${lightHref}">Light</a></p>
      </article>`;
}

function render(figures) {
  const groups = new Map();
  for (const meta of figures) {
    const key = meta.project || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(meta);
  }
  const sections = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([project, items]) => {
      const cards = items
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
        .map(card)
        .join("\n");
      return `    <section class="group">
      <h2>${escapeHtml(project)}</h2>
      <div class="grid">
${cards}
      </div>
    </section>`;
    })
    .join("\n");

  const template = readFileSync(TEMPLATE, "utf8");
  return template
    .replace("<!--FIGURES-->", sections || '<p class="empty">No figures yet.</p>')
    .replace("<!--COUNT-->", String(figures.length));
}

function main() {
  const slugs = figureDirs();
  if (!slugs.length) {
    console.warn("no figures found under figures/");
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const metas = [];
  for (const slug of slugs) {
    console.log(`\n== ${slug} ==`);
    buildFigure(slug);
    stageFigure(slug);
    metas.push(readMeta(slug));
  }

  writeFileSync(join(OUT, "index.html"), render(metas));
  writeFileSync(join(OUT, ".nojekyll"), "");
  console.log(`\nbuilt ${metas.length} figure(s) into _site/`);
}

main();
