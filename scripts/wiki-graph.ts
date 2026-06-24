// Deriva content/graph.json dalle pagine del wiki (nessuna chiamata LLM).
// Eseguito in automatico prima di dev/build per tenere il grafo sincronizzato.
//
// È volutamente TOLLERANTE rispetto a come il wiki viene generato:
//  - scansiona ricorsivamente content/wiki/**/*.md (qualsiasi sottocartella),
//  - ricava `type` dal frontmatter o dal nome della cartella,
//  - risolve i [[link]] per id esatto, oppure per slug dell'id/titolo (così
//    funziona anche con link in stile [[Titolo Pagina]]).
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const WIKI_DIR = join(process.cwd(), "content", "wiki");
// File a livello radice che non sono "pagine" del grafo.
const SKIP_FILES = new Set(["index.md", "log.md", "readme.md"]);

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

/** Elenco ricorsivo dei .md sotto content/wiki, con la cartella di primo livello. */
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

export function buildWikiGraph(): WikiGraphData {
  const pages: WikiPageData[] = [];
  const warnings: string[] = [];

  for (const { file, topFolder } of listMarkdown(WIKI_DIR)) {
    // I file a livello radice (index.md, log.md, SCHEMA.md, overview.md) sono
    // navigazionali/meta: non sono nodi del grafo. Conta solo ciò che sta in una sottocartella.
    if (!topFolder) continue;
    const raw = readFileSync(file, "utf8");
    const { data, content } = matter(raw);
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
  const outFile = join(process.cwd(), "content", "graph.json");
  if (!existsSync(WIKI_DIR)) {
    const empty: WikiGraphData = {
      generatedAt: new Date().toISOString(),
      pages: [],
      edges: [],
      warnings: ["wiki non ancora generato — crea le pagine in content/wiki/"],
    };
    writeFileSync(outFile, JSON.stringify(empty, null, 2));
    console.warn("⚠ content/wiki assente: generato graph.json vuoto.");
    return;
  }
  const graph = buildWikiGraph();
  writeFileSync(outFile, JSON.stringify(graph, null, 2));
  console.log(`✓ graph.json: ${graph.pages.length} pagine, ${graph.edges.length} collegamenti.`);
  if (graph.warnings.length) {
    console.warn(`⚠ ${graph.warnings.length} avvisi:`);
    for (const w of graph.warnings.slice(0, 20)) console.warn("  - " + w);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
