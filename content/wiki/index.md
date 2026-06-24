---
title: Index — Knowledge Base Aurora
type: index
updated: 2026-06-24
---

# Index — Knowledge Base Officine Meccaniche Aurora

Catalogo di tutte le pagine del wiki. Punto di partenza per ogni query: si legge prima l'index per
trovare le pagine rilevanti, poi si entra nel dettaglio. Vedi anche [[overview]], [[log]],
[[SCHEMA]].

**Stato**: 6 fonti ingestite · 7 entità · 18 concetti · ultimo aggiornamento 2026-06-24.

## 🏛️ Entità
| Pagina | In una riga |
|--------|-------------|
| [[officine-meccaniche-aurora]] | L'azienda: cuscinetti di precisione, 1987, 84 persone, ISO 9001. |
| [[stabilimento-vimercate]] | Stab. 1: uffici + lavorazioni CNC; portineria onboarding. |
| [[stabilimento-agrate]] | Stab. 2: assemblaggio + magazzino centrale (spedizioni). |
| [[linea-cuscinetti-ax]] | Prodotto di punta: AX-100/200/300, acciaio 100Cr6, NLGI 2. |
| [[organizzazione-reparti]] | I 5 reparti + funzione RSPP. |
| [[reparto-qualita]] | Controlli, collaudo, gestione NC; capo Stefano Riva. |
| [[carla-moretti]] | Direttore stabilimento Vimercate. |
| [[stefano-riva]] | Responsabile Qualità; unico che autorizza le deroghe. |

## ⚙️ Concetti e processi
### Qualità
| Pagina | In una riga |
|--------|-------------|
| [[iso-9001-sgq]] | Il SGQ certificato dal 2009; politica, KPI, audit annuali. |
| [[non-conformita]] | 🔗 **Hub.** Ciclo NC: apertura → blocco → trattamento → chiusura. |
| [[collaudo]] | Le 3 fasi di controllo; prove rotazione/rumorosità/gioco sugli AX. |
| [[tolleranze-classi-precisione]] | Classi P0/P6/P5, caratteristiche critiche ◆, GD&T. |
| [[taratura-strumenti]] | Strumenti tarati: fuori taratura = non usabile in accettazione. |
| [[azioni-correttive]] | Miglioramento da NC ricorrenti, reclami, audit. |
| [[rilascio-lotto]] | 🔗 **Cerniera.** Collaudo positivo → lotto spedibile. |
| [[area-blocco-merci]] | 🔗 **Hub.** Isolamento di pezzi NC e resi in attesa. |
### Sicurezza
| Pagina | In una riga |
|--------|-------------|
| [[dpi]] | DPI obbligatori; guanti anti-taglio per il montaggio. |
| [[sicurezza-emergenze]] | Segnaletica, evacuazione, primo soccorso, antincendio, LOTO. |
| [[formazione-sicurezza]] | 🔗 **Cerniera** Sicurezza ↔ Onboarding ↔ Audit. |
### HR
| Pagina | In una riga |
|--------|-------------|
| [[onboarding]] | Primo giorno, formazione obbligatoria, dotazioni, buddy. |
| [[ferie-permessi]] | Ferie (preavviso 15gg), permessi, smart working. |
| [[chiusure-aziendali]] | 🔗 **Cerniera** HR ↔ manutenzione programmata. |
### Produzione / Manutenzione
| Pagina | In una riga |
|--------|-------------|
| [[manutenzione-preventiva]] | Piani CNC, lubrificazione NLGI 2, LOTO, fermi macchina. |
### Commerciale / Prodotto
| Pagina | In una riga |
|--------|-------------|
| [[condizioni-vendita]] | Si spedisce solo merce con lotto rilasciato; DDT. |
| [[garanzia]] | 24 mesi; decade per montaggio errato. |
| [[resi-reclami-rma]] | RMA, analisi reso → NC, reclami → azioni correttive. |

## 📄 Fonti (raw)
| Pagina | File grezzo |
|--------|-------------|
| [[01-manuale-aziendale]] | `raw/01-manuale-aziendale.md` |
| [[02-manuale-qualita-iso9001]] | `raw/02-manuale-qualita-iso9001.md` |
| [[03-memo-sicurezza]] | `raw/03-memo-sicurezza.txt` |
| [[04-hr-onboarding-ferie]] | `raw/04-hr-onboarding-ferie.md` |
| [[05-log-manutenzione-cnc]] | `raw/05-log-manutenzione-cnc.md` |
| [[06-vendite-garanzia-prodotto]] | `raw/06-vendite-garanzia-prodotto.md` |

## 🔎 Lacune e idee (per il prossimo lint / nuove fonti)
- **Persone**: documentati solo 2 nomi (Moretti, Riva). Mancano referenti di Produzione, Logistica,
  Commerciale, HR e il nome del RSPP (firma "M." nel memo).
- **Dati prodotto**: valori numerici di C/C0, intervalli di rilubrificazione, range dimensionali AX
  non presenti negli estratti.
- **KPI**: il SGQ cita scarti/rilavorazioni/puntualità ma senza target né valori.
- **Procedure parziali**: condizioni generali di vendita, schede macchina CNC e manuale prodotto
  completo sono richiamati ma non presenti tra le fonti.
- **Possibile pagina futura**: un "flusso del pezzo" end-to-end (materia prima → collaudo → rilascio
  → spedizione → eventuale reso) come diagramma.
