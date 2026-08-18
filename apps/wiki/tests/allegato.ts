// Oracolo dei test del task 151: l'ALLEGATO al ticket Productive #151, cioe' l'elenco
// per verticale delle tipologie documentali, con la marcatura `X` che distingue
// "consultabile" da "solo menzionata" (spec 151, §"Distinzione operativa").
//
// I test NON ricopiano l'elenco: lo leggono dal file allegato al ticket, cosi' che la
// fonte di verita' resti una sola. Se l'allegato cambia, i test cambiano con lui.
//
// Usato sia dai test unit (vitest) sia dagli e2e (playwright).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Risoluzione dei path indipendente dalla cwd e dal runner (vitest ESM / playwright CJS):
// si risale fino alla root del repo, riconoscibile dalla cartella .ai-dev.
function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, ".ai-dev"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`root del repo non trovata risalendo da ${process.cwd()} (manca .ai-dev)`);
}

/** Root dell'app wiki (apps/wiki). */
export const WIKI_ROOT = path.join(repoRoot(), "apps", "wiki");

/** Allegato del ticket Productive #151 (19362740). */
export const ALLEGATO_PATH = path.join(
  repoRoot(),
  ".ai-dev",
  "attachments",
  "productive-19362740",
  "Knowledge_Base_-_Use_case__(1).md",
);

export interface VoceAllegato {
  /** Etichetta della voce, verbatim dall'allegato (senza la marcatura X). */
  label: string;
  /** true = voce marcata `X` nell'allegato => deve essere CONSULTABILE. */
  covered: boolean;
}

export interface VerticaleAllegato {
  /** Nome del verticale, es. "Manifatturiero". */
  name: string;
  voci: VoceAllegato[];
}

/**
 * Confronto testuale tollerante alle sole differenze non semantiche:
 * escape markdown (`\-`), varianti di trattino, spazi multipli, maiuscole.
 */
export function normalize(s: string): string {
  return s
    .replace(/\\(.)/g, "$1")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

let cached: VerticaleAllegato[] | null = null;

/** Parsa l'allegato: 3 verticali, ciascuno con le sue voci e la marcatura X. */
export function readAllegato(): VerticaleAllegato[] {
  if (cached) return cached;
  const md = readFileSync(ALLEGATO_PATH, "utf8");
  const verticali: VerticaleAllegato[] = [];

  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();

    const heading = line.match(/^\*\*\s*\d+\\?\.\s*(.+?)\s*\*\*$/);
    if (heading) {
      verticali.push({ name: heading[1].replace(/\\(.)/g, "$1").trim(), voci: [] });
      continue;
    }

    const bullet = line.match(/^\*\s+(.+)$/);
    if (bullet && verticali.length > 0) {
      const text = bullet[1].trim();
      const covered = /\sX$/.test(text);
      const label = (covered ? text.replace(/\sX$/, "") : text).replace(/\\(.)/g, "$1").trim();
      if (label) verticali[verticali.length - 1].voci.push({ label, covered });
    }
  }

  cached = verticali;
  return verticali;
}

/** Il verticale il cui nome coincide (normalizzato) con quello passato. */
export function verticaleByName(name: string): VerticaleAllegato | undefined {
  return readAllegato().find((v) => normalize(v.name) === normalize(name));
}

/** Path assoluto di content/<slug>. */
export function contentDir(slug: string): string {
  return path.join(WIKI_ROOT, "content", slug);
}

/** File presenti in content/<slug>/raw/ (nomi, non path). */
export function rawFiles(slug: string): string[] {
  try {
    return readdirSync(path.join(contentDir(slug), "raw"), { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith("."))
      .map((d) => d.name);
  } catch {
    return [];
  }
}
