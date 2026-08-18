# Registro Domande/Risposte — Evoluzione AI Demo Wiki (Productive #262)
> Tracciabilità dell'intervista sui buchi della specifica.

## D1: Set di use-case da implementare (il file MD ha 3 verticali; Aurora è già manifatturiero)?
R: Aurora = Manifatturiero (riuso i contenuti esistenti) + 2 nuove aziende (Edilizia, Servizi). 3 totali.

## D2: Quanto ricchi i contenuti delle aziende nuove?
R: Paragonabili ad Aurora (~30 pagine per azienda).

## D3: Come si seleziona lo use-case?
R: Galleria in landing → route per-azienda `/wiki/<slug>`.

## D4: Nomi/palette delle 2 aziende nuove?
R: Confermati i proposti — Edilizia = "Borealis Costruzioni S.p.A." (amber/terracotta/slate);
   Servizi = "Meridian Studio Associato" (emerald/teal/indigo).

## D5: Comportamento del vecchio path /wiki?
R: Redirect alla galleria (home).

## D6: I ~30 documenti per azienda: temi precisi o liberi?
R: Derivati dagli elenchi del file MD del task, per ciascun verticale.

---

# Registro Domande/Risposte — Revisione documenti knowledge base (Productive #151)

## D1: "Rivedere la natura delle aziende proposte" — cosa va rivisto? (mappatura gia' 1:1)
R: Nulla da cambiare. Le 3 aziende restano Aurora/Borealis/Meridian; si lavora solo su documenti e ambiti.

## D2: "Ricerca Semantica su knowledge interna" (Meridian, X) non e' una tipologia documentale
R: [assunzione dell'orchestratore, non contestata al Gate 1] Non genera un documento: e' la capability
   della demo stessa. Compare nella vetrina degli ambiti in homepage come cosa che il sistema fa.

## D3: Voci senza X oggi coperte da documenti pieni (16 dei 18 sorgenti)?
R: RIBILANCIAMENTO. Le voci X diventano documentazione consultabile; le voci senza X scendono a
   semplice menzione. Si disfa consapevolmente parte del lavoro di #262 Fase A/B → a changelog.

## D4: Contenuti Aurora fuori elenco (HR, DPI, emergenze)?
R: Conseguenza di D3: degradati a menzione. Le suggestions del registry che vi puntano vanno riviste.

## D5: Volume — 1 documento per voce X? profondita' target?
R: [assunzione dell'orchestratore] 1 documento raw + pagina sources per voce X. Le 3 aziende restano
   confrontabili: nessuna sotto il 70% dei nodi della piu' ricca.

## D6: Quanto deve essere "menzionata" una voce senza X?
R: Best-effort nel testo (menzione dove il discorso la porta, nessuna copertura obbligatoria pagina
   per pagina) MA in piu': nella HOMEPAGE di ogni azienda vanno esposti gli ambiti trattati e quelli
   NON trattati direttamente dai documenti, come argomenti che una versione definitiva ad hoc per
   quell'azienda coprirebbe. Motivo: e' un POC — chi lo usa deve capire subito cosa trovera' e cosa no.

## D7: Perimetro — anche lib/usecases.ts?
R: Si'. tagline/suggestions e la mappa degli ambiti per azienda possono stare nel registry.
