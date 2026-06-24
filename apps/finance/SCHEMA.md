# SCHEMA — `finance.db` (Vertex Group)

> Questo file è la **fonte di verità** dello schema del database della demo finance e viene
> iniettato nel system prompt dell'assistente AI. **Tenerlo allineato a `scripts/seed-db.ts`.**

**Azienda:** *Vertex Group* — gruppo di **retail & distribuzione multi-divisione**, multi-regione, valuta **EUR**.
**Motore:** SQLite (sola lettura a runtime). Tutti gli importi sono in euro; i mesi sono stringhe `'YYYY-MM'`.

- **Storico:** 36 mesi, da `2023-07` a `2026-06` (incluso).
- **Forecast:** 18 mesi, da `2026-07` a `2027-12`, in 3 scenari.
- I **COGS** (costo del venduto) stanno in `sales.cogs`. I **costi operativi (opex)** stanno in `costs`.
  Quindi: **EBITDA = ricavi netti − COGS − opex**.

---

## Tabelle dimensionali

### `divisions` — le 5 business unit
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | `Elettronica`, `Casa & Arredo`, `Moda`, `Food & Beverage`, `Sport & Outdoor` |
| description | TEXT | |

### `regions` — aree geografiche
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | `Nord-Ovest`, `Nord-Est`, `Centro`, `Sud`, `Isole`, `Estero (EU)` |
| macro_area | TEXT | `Italia` o `Internazionale` |
| country | TEXT | `IT` o `EU` |

### `channels` — canali di vendita
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | `Negozi`, `E-commerce`, `Wholesale`, `Marketplace` |
| kind | TEXT | `B2C` o `B2B` (solo Wholesale è B2B) |
| description | TEXT | |

### `products` — catalogo (~80)
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| sku | TEXT | |
| name | TEXT | |
| division_id | INTEGER FK→divisions | |
| category | TEXT | sotto-categoria merceologica (dipende dalla divisione) |
| list_price | REAL | prezzo di listino unitario (EUR) |
| unit_cost | REAL | costo unitario (EUR) |
| launch_month | TEXT | `'YYYY-MM'` |
| active | INTEGER | 1 = a catalogo, 0 = dismesso |

### `customers` — clienti (~186)
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | ragione sociale (B2B) o `Consumatori <regione>` (B2C aggregato) |
| segment | TEXT | `Enterprise`, `Mid-Market`, `SMB`, `Reseller`, `Consumer` |
| industry | TEXT | settore del cliente |
| region_id | INTEGER FK→regions | |
| acquisition_month | TEXT | mese di acquisizione |
| status | TEXT | `active` o `churned` |
| churn_month | TEXT NULL | mese di abbandono (se churned) |
| credit_rating | TEXT | `AAA`..`B` o `n/d` |

> Nota: le vendite B2C (Negozi/E-commerce/Marketplace) sono attribuite a clienti aggregati
> `Consumer` per regione; le vendite Wholesale a clienti B2B nominali.

### `employees` — organico (320)
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| full_name | TEXT | |
| department | TEXT | `Sales`, `Operations`, `Logistics`, `Marketing`, `IT`, `Finance`, `HR`, `Customer Service`, `R&D`, `Management` |
| role | TEXT | |
| division_id | INTEGER FK→divisions NULL | NULL per le funzioni trasversali |
| region_id | INTEGER FK→regions | |
| hire_date | TEXT | `'YYYY-MM-DD'` |
| termination_date | TEXT NULL | |
| monthly_gross_salary | REAL | RAL mensile lorda (EUR) |
| employment_type | TEXT | `Full-time`, `Part-time`, `Contract` |
| status | TEXT | `active` o `left` |

### `competitors` — player di mercato (5, incluso Vertex)
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | `Vertex Group`, `MegaMart Retail`, `CasaViva`, `ModaPrima`, `SportPlanet` |
| hq_country | TEXT | |
| primary_division_id | INTEGER FK→divisions NULL | divisione di forza del competitor |
| is_self | INTEGER | 1 solo per `Vertex Group` |

---

## Tabelle dei fatti

### `sales` — riga d'ordine (~66.000 righe, granularità mese × prodotto × cliente × regione × canale)
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| month | TEXT | `'YYYY-MM'` |
| customer_id | INTEGER FK→customers | |
| product_id | INTEGER FK→products | (→ `division_id`, `category` via join) |
| region_id | INTEGER FK→regions | |
| channel_id | INTEGER FK→channels | |
| units | INTEGER | quantità |
| gross_revenue | REAL | ricavo lordo (prima dello sconto) |
| discount | REAL | sconto applicato (EUR) |
| net_revenue | REAL | **ricavo netto** = gross_revenue − discount |
| cogs | REAL | costo del venduto |
| gross_margin | REAL | = net_revenue − cogs |

### `costs` — costi operativi (opex) mensili
| col | tipo | note |
|---|---|---|
| id | INTEGER PK | |
| month | TEXT | |
| division_id | INTEGER FK→divisions NULL | NULL = costo condiviso/corporate |
| region_id | INTEGER NULL | attualmente sempre NULL |
| category | TEXT | `Personale`, `Marketing`, `Logistica`, `Affitti`, `IT & Software`, `G&A`, `Ammortamenti` |
| amount | REAL | importo (EUR). **NON include i COGS** (sono in `sales`). |

### `competitor_metrics` — quote e metriche di mercato, mensili
| col | tipo | note |
|---|---|---|
| month | TEXT | |
| competitor_id | INTEGER FK→competitors | |
| market_share_pct | REAL | quota di mercato % |
| est_revenue | REAL | ricavi stimati (EUR) |
| price_index | REAL | indice prezzi (1.0 = Vertex baseline) |
| nps | REAL | Net Promoter Score |

### `forecasts` — previsioni (18 mesi, 3 scenari)
| col | tipo | note |
|---|---|---|
| month | TEXT | da `2026-07` a `2027-12` |
| scenario | TEXT | `baseline`, `optimistic`, `pessimistic` |
| division_id | INTEGER FK→divisions NULL | **NULL = totale gruppo (ALL)** |
| metric | TEXT | `revenue`, `costs`, `margin` |
| value | REAL | valore previsto (EUR) |

> Per il totale aziendale filtra `division_id IS NULL`. Per divisione filtra `division_id = ?`.

### `forecast_drivers` — assunzioni dietro gli scenari
`scenario`, `driver`, `value`, `unit`, `note`. Es.: crescita ricavi MoM, pressione costi, churn.

### `budgets` — obiettivi FY2026 (gennaio–dicembre 2026)
`month`, `division_id` (FK), `metric` (`revenue`), `target` (EUR). Utile per analisi **budget vs actual**.

---

## Viste pronte all'uso (preferiscile per query veloci)

### `v_sales_enriched`
Ogni riga di `sales` già **joinata** con tutte le dimensioni in chiaro:
`month, units, gross_revenue, discount, net_revenue, cogs, gross_margin, division_id, division, category, product, region, macro_area, channel, channel_kind, customer, segment, industry`.

### `v_pl_monthly` — conto economico mensile consolidato
`month, revenue, cogs, gross_margin, opex, ebitda`.

---

## Esempi di query

```sql
-- Ricavi netti e EBITDA per mese (ultimi 12 mesi storici)
SELECT month, revenue, ebitda FROM v_pl_monthly ORDER BY month DESC LIMIT 12;

-- Top 5 divisioni per ricavi e margine % nel 2026
SELECT division, SUM(net_revenue) AS ricavi,
       ROUND(SUM(gross_margin)*100.0/SUM(net_revenue),1) AS margine_pct
FROM v_sales_enriched WHERE month LIKE '2026-%'
GROUP BY division ORDER BY ricavi DESC;

-- Mix ricavi per canale, ultimo mese
SELECT channel, SUM(net_revenue) AS ricavi
FROM v_sales_enriched WHERE month = '2026-06'
GROUP BY channel ORDER BY ricavi DESC;

-- Top 10 clienti B2B per ricavi
SELECT customer, segment, SUM(net_revenue) AS ricavi
FROM v_sales_enriched WHERE segment != 'Consumer'
GROUP BY customer ORDER BY ricavi DESC LIMIT 10;

-- Forecast totale gruppo per scenario, anno 2027
SELECT scenario, SUM(value) AS ricavi_2027
FROM forecasts WHERE metric='revenue' AND division_id IS NULL AND month LIKE '2027-%'
GROUP BY scenario;

-- Andamento quota di mercato di Vertex vs concorrenti
SELECT m.month, c.name, m.market_share_pct
FROM competitor_metrics m JOIN competitors c ON c.id = m.competitor_id
WHERE m.month IN ('2023-07','2026-06') ORDER BY m.month, m.market_share_pct DESC;

-- Costo del personale per divisione (ultimo mese)
SELECT d.name, c.amount FROM costs c JOIN divisions d ON d.id = c.division_id
WHERE c.category='Personale' AND c.month='2026-06' ORDER BY c.amount DESC;
```

## Regole per generare SQL (text-to-SQL)
- **Solo `SELECT`/`WITH`** (sola lettura). Niente `INSERT/UPDATE/DELETE/PRAGMA/ATTACH/...`.
- Un solo statement. Usa sempre i **nomi tabella/colonna esatti** qui sopra.
- Preferisci le **viste** `v_sales_enriched` e `v_pl_monthly` quando possibile.
- Filtra i mesi con `month LIKE '2026-%'` o `month BETWEEN '2025-01' AND '2025-12'`.
- Per i ricavi usa **`net_revenue`** (non `gross_revenue`) salvo richiesta esplicita.
- Aggiungi sempre un `LIMIT` ragionevole se la query può restituire molte righe.
