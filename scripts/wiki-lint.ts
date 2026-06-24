// Lint del wiki (health check, no LLM): orfani, link non risolti, pagine senza summary.
import "./load-env";
import { buildWikiGraph } from "./wiki-graph";

function main() {
  const g = buildWikiGraph();
  if (g.pages.length === 0) {
    console.log("Wiki vuoto: crea le pagine in content/wiki/.");
    return;
  }

  const inbound = new Map<string, number>();
  for (const p of g.pages) inbound.set(p.id, 0);
  for (const e of g.edges) inbound.set(e.target, (inbound.get(e.target) ?? 0) + 1);

  const orphans = g.pages.filter((p) => p.type !== "source" && (inbound.get(p.id) ?? 0) === 0);
  const noSummary = g.pages.filter((p) => !p.summary);

  console.log(`Wiki: ${g.pages.length} pagine, ${g.edges.length} collegamenti.`);
  console.log(`\nOrfani (nessun link in ingresso): ${orphans.length}`);
  orphans.forEach((p) => console.log(`  - ${p.id}`));
  console.log(`\nSenza summary: ${noSummary.length}`);
  noSummary.forEach((p) => console.log(`  - ${p.id}`));
  console.log(`\nLink non risolti: ${g.warnings.length}`);
  g.warnings.forEach((w) => console.log(`  - ${w}`));
}

main();
