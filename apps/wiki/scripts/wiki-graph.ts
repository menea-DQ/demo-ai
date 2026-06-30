// Deriva content/<slug>/graph.json dalle pagine di ogni azienda (nessuna chiamata LLM).
// Eseguito in automatico prima di dev/build/test per tenere i grafi sincronizzati.
//
// Multi use-case: ogni sottocartella di content/ che contiene un wiki/ è un'azienda
// (slug = nome cartella). Per ciascuna si scrive content/<slug>/graph.json.
//
// È volutamente TOLLERANTE rispetto a come il wiki viene generato:
//  - scansiona ricorsivamente <slug>/wiki/**/*.md (qualsiasi sottocartella),
//  - ricava `type` dal frontmatter o dal nome della cartella,
//  - risolve i [[link]] per id esatto, oppure per slug dell'id/titolo (così
//    funziona anche con link in stile [[Titolo Pagina]]).
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { slugify } from "../lib/slug";

export interface WikiPageData {
  id: string;
  type: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  markdown: string;
  links: string[];
}
export interface WikiGraphData {
  generatedAt: string;
  pages: WikiPageData[];
  edges: { source: string; target: string }[];
  warnings: string[];
}

const CONTENT_DIR = join(process.cwd(), "content");
// File a livello radice che non sono "pagine" del grafo.
const SKIP_FILES = new Set(["index.md", "log.md", "readme.md", "schema.md", "overview.md"]);

/** Le aziende = sottocartelle di content/ con dentro un wiki/. slug = nome cartella. */
export function usecaseDirs(): { slug: string; wikiDir: string; outFile: string }[] {
  if (!existsSync(CONTENT_DIR)) return [];
  const out: { slug: string; wikiDir: string; outFile: string }[] = [];
  for (const entry of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const wikiDir = join(CONTENT_DIR, entry.name, "wiki");
    if (existsSync(wikiDir) && statSync(wikiDir).isDirectory()) {
      out.push({ slug: entry.name, wikiDir, outFile: join(CONTENT_DIR, entry.name, "graph.json") });
    }
  }
  return out;
}

export function extractLinks(text: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1].split("#")[0].trim();
    if (id) out.push(id);
  }
  return out;
}

/** Elenco ricorsivo dei .md sotto una cartella wiki, con la cartella di primo livello. */
function listMarkdown(dir: string, topFolder = ""): { file: string; topFolder: string }[] {
  const out: { file: string; topFolder: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdown(full, topFolder || entry.name));
    } else if (entry.name.endsWith(".md") && !SKIP_FILES.has(entry.name.toLowerCase())) {
      out.push({ file: full, topFolder });
    }
  }
  return out;
}

/** Ricava un summary dal primo paragrafo utile del markdown (quando manca nel frontmatter). */
function deriveSummary(markdown: string): string {
  for (const block of markdown.split(/\n\s*\n/)) {
    const line = block.trim();
    if (!line || line.startsWith("#")) continue;
    const plain = line
      .replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_m, id, label) => label || id)
      .replace(/[*_`>#-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length < 8) continue;
    return plain.length > 160 ? plain.slice(0, 157) + "…" : plain;
  }
  return "";
}

function folderToType(folder: string): string {
  const f = folder.toLowerCase();
  if (f.startsWith("source")) return "source";
  if (f.startsWith("entit") || f === "people" || f === "persone") return "entity";
  return "concept";
}

export function buildWikiGraph(wikiDir: string): WikiGraphData {
  const pages: WikiPageData[] = [];
  const warnings: string[] = [];

  for (const { file, topFolder } of listMarkdown(wikiDir)) {
    // I file a livello radice (index.md, log.md, SCHEMA.md, overview.md) sono
    // navigazionali/meta: non sono nodi del grafo. Conta solo ciò che sta in una sottocartella.
    if (!topFolder) continue;
    const raw = readFileSync(file, "utf8");
    // Frontmatter YAML malformato (es. un ": " non quotato) non deve far crollare la build:
    // si avvisa e si tratta la pagina come priva di frontmatter (id dal nome file, type dalla cartella).
    let data: Record<string, unknown> = {};
    let content = raw;
    try {
      const fm = matter(raw);
      data = fm.data as Record<string, unknown>;
      content = fm.content;
    } catch (e) {
      warnings.push(`Frontmatter non valido in ${file} (ignorato): ${(e as Error).message.split("\n")[0]}`);
    }
    const id = String(data.id ?? file.split("/").pop()!.replace(/\.md$/, ""));
    const type = String(data.type ?? folderToType(topFolder));
    const md = content.trim();
    pages.push({
      id,
      type,
      title: String(data.title ?? id),
      category: String(data.category ?? "Generale"),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      summary: String(data.summary ?? deriveSummary(md)),
      markdown: md,
      links: extractLinks(content),
    });
  }

  // Indici per risolvere i link in modo tollerante.
  const byId = new Set(pages.map((p) => p.id));
  const bySlugId = new Map(pages.map((p) => [slugify(p.id), p.id]));
  const bySlugTitle = new Map(pages.map((p) => [slugify(p.title), p.id]));

  function resolve(target: string): string | null {
    if (byId.has(target)) return target;
    const s = slugify(target);
    return bySlugId.get(s) ?? bySlugTitle.get(s) ?? null;
  }

  const edges: { source: string; target: string }[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    const valid: string[] = [];
    for (const target of p.links) {
      const resolved = resolve(target);
      if (!resolved) {
        warnings.push(`Link non risolto "${target}" in ${p.id} (ignorato)`);
        continue;
      }
      if (resolved === p.id) continue;
      valid.push(resolved);
      const key = `${p.id}->${resolved}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: p.id, target: resolved });
      }
    }
    p.links = Array.from(new Set(valid));
  }

  return { generatedAt: new Date().toISOString(), pages, edges, warnings };
}

function main() {
  const dirs = usecaseDirs();
  if (dirs.length === 0) {
    console.warn("⚠ Nessuna azienda trovata in content/<slug>/wiki/.");
    return;
  }
  for (const { slug, wikiDir, outFile } of dirs) {
    const graph = buildWikiGraph(wikiDir);
    writeFileSync(outFile, JSON.stringify(graph, null, 2));
    console.log(`✓ ${slug}/graph.json: ${graph.pages.length} pagine, ${graph.edges.length} collegamenti.`);
    if (graph.warnings.length) {
      console.warn(`  ⚠ ${graph.warnings.length} avvisi (primi 10):`);
      for (const w of graph.warnings.slice(0, 10)) console.warn("    - " + w);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
