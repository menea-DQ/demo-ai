// Lint del wiki (health check, no LLM): orfani, link non risolti, pagine senza summary.
// Multi use-case: esegue il controllo per ogni azienda in content/<slug>/wiki/.
import "./load-env";
import { buildWikiGraph, usecaseDirs } from "./wiki-graph";

function lint(slug: string, wikiDir: string) {
  const g = buildWikiGraph(wikiDir);
  console.log(`\n=== ${slug} ===`);
  if (g.pages.length === 0) {
    console.log(`Wiki vuoto: crea le pagine in content/${slug}/wiki/.`);
    return;
  }

  const inbound = new Map<string, number>();
  for (const p of g.pages) inbound.set(p.id, 0);
  for (const e of g.edges) inbound.set(e.target, (inbound.get(e.target) ?? 0) + 1);

  const orphans = g.pages.filter((p) => p.type !== "source" && (inbound.get(p.id) ?? 0) === 0);
  const noSummary = g.pages.filter((p) => !p.summary);

  console.log(`Wiki: ${g.pages.length} pagine, ${g.edges.length} collegamenti.`);
  console.log(`Orfani (nessun link in ingresso): ${orphans.length}`);
  orphans.forEach((p) => console.log(`  - ${p.id}`));
  console.log(`Senza summary: ${noSummary.length}`);
  noSummary.forEach((p) => console.log(`  - ${p.id}`));
  console.log(`Link non risolti: ${g.warnings.length}`);
  g.warnings.forEach((w) => console.log(`  - ${w}`));
}

function main() {
  const dirs = usecaseDirs();
  if (dirs.length === 0) {
    console.log("Nessuna azienda trovata in content/<slug>/wiki/.");
    return;
  }
  for (const { slug, wikiDir } of dirs) lint(slug, wikiDir);
}

main();
