"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { ClientGraph } from "./types";

interface GNode extends SimulationNodeDatum {
  id: string;
  label: string;
  group: string;
}
type GLink = SimulationLinkDatum<GNode>;

const PALETTE: Record<string, string> = {
  // categorie di dominio
  Azienda: "#8a8f98",
  Prodotti: "#8fb3ff",
  "Qualità": "#7fe7ff",
  Sicurezza: "#ffb27f",
  HR: "#e9a8ff",
  Operations: "#9be79b",
  Commerciale: "#ffd27f",
  // tipi di pagina (fallback)
  Concetto: "#8fb3ff",
  "Entità": "#9be79b",
  Sorgente: "#ffb27f",
};
const colorFor = (group: string) => PALETTE[group] ?? "#b9bac0";

const TYPE_LABEL: Record<string, string> = { source: "Sorgente", concept: "Concetto", entity: "Entità" };

export default function GraphView({
  graph,
  activeIds,
  onOpenPage,
}: {
  graph: ClientGraph;
  activeIds: string[];
  onOpenPage: (pageId: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [, setFrame] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });

  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const didFitRef = useRef(false);
  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);

  // Raggruppamento adattivo: per categoria se ce n'è più d'una significativa, altrimenti per tipo.
  const { groupOf, legend } = useMemo(() => {
    const cats = new Set(graph.pages.map((p) => p.category).filter((c) => c && c !== "Generale"));
    const useCat = cats.size > 1;
    const fn = (p: { category: string; type: string }) =>
      useCat ? p.category : TYPE_LABEL[p.type] ?? p.type;
    const groups = [...new Set(graph.pages.map(fn))];
    return { groupOf: fn, legend: groups };
  }, [graph.pages]);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      const s = String(e.source), t = String(e.target);
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return m;
  }, [graph.edges]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      // Ignora quando il pannello è nascosto (display:none → 0×0): evita di rilanciare
      // la simulazione e di "fittare" su dimensioni errate al cambio tab.
      if (r.width < 1 || r.height < 1) return;
      setSize({ w: Math.max(320, r.width), h: Math.max(360, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const nodes: GNode[] = graph.pages.map((p) => ({ id: p.id, label: p.title, group: groupOf(p) }));
    const links: GLink[] = graph.edges.map((e) => ({ source: e.source, target: e.target }));
    nodesRef.current = nodes;
    linksRef.current = links;
    didFitRef.current = false;

    // Forze tarate per un grafo DENSO (molti archi): forte repulsione, archi lunghi e "morbidi",
    // così i nodi si distribuiscono invece di aggrovigliarsi.
    const sim = forceSimulation<GNode, GLink>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(150).strength(0.05))
      .force("charge", forceManyBody().strength(-520).distanceMax(900))
      .force("center", forceCenter(size.w / 2, size.h / 2))
      .force("x", forceX(size.w / 2).strength(0.04))
      .force("y", forceY(size.h / 2).strength(0.04))
      .force("collide", forceCollide(30))
      .alpha(1)
      .alphaDecay(0.02);

    sim.on("tick", () => setFrame((f) => f + 1));
    sim.on("end", () => fitView());
    simRef.current = sim;
    return () => void sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, size.w, size.h]);

  function toGraph(clientX: number, clientY: number) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - view.tx) / view.k, y: (clientY - rect.top - view.ty) / view.k };
  }

  // Centra e scala il grafo perché entri tutto nella vista (con margine).
  function fitView(force = false) {
    if (!force && didFitRef.current) return;
    const ns = nodesRef.current;
    const el = wrapRef.current;
    if (!el || ns.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of ns) {
      if (n.x == null || n.y == null) continue;
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    if (!isFinite(minX)) return;
    const rect = el.getBoundingClientRect();
    const pad = 70;
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const k = Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ k, tx: rect.width / 2 - cx * k, ty: rect.height / 2 - cy * k });
    didFitRef.current = true;
  }

  const dragRef = useRef<GNode | null>(null);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function onNodePointerDown(e: React.PointerEvent, n: GNode) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = n;
    simRef.current?.alphaTarget(0.3).restart();
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const p = toGraph(e.clientX, e.clientY);
      dragRef.current.fx = p.x;
      dragRef.current.fy = p.y;
    } else if (panRef.current) {
      const p = panRef.current;
      setView((v) => ({ ...v, tx: p.tx + (e.clientX - p.x), ty: p.ty + (e.clientY - p.y) }));
    }
  }
  function onPointerUp() {
    if (dragRef.current) {
      dragRef.current.fx = null;
      dragRef.current.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
    panRef.current = null;
  }
  function onBgPointerDown(e: React.PointerEvent) {
    panRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  }
  function onWheel(e: React.WheelEvent) {
    const delta = -e.deltaY * 0.0012;
    setView((v) => ({ ...v, k: Math.min(2.5, Math.max(0.4, v.k * (1 + delta))) }));
  }

  const nodes = nodesRef.current;
  const links = linksRef.current;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-[color:color-mix(in_srgb,var(--color-ink)_8%,transparent)] flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg">Knowledge Graph</h2>
          <p className="text-xs text-[color:var(--color-ink-soft)]">
            {nodes.length} pagine · {links.length} collegamenti - clicca un nodo per aprirlo
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-[55%]">
          {legend.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-ink-soft)]">
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(c) }} />
              {c}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <svg width="100%" height="100%" onPointerDown={onBgPointerDown} style={{ display: "block" }}>
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
            {links.map((l, i) => {
              const s = l.source as GNode;
              const t = l.target as GNode;
              if (s.x == null || t.x == null) return null;
              const active = hover != null ? s.id === hover || t.id === hover : activeSet.has(s.id) || activeSet.has(t.id);
              return (
                <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#141414" strokeOpacity={active ? 0.45 : 0.08} strokeWidth={active ? 1.4 : 1} />
              );
            })}
            {nodes.map((n) => {
              const isActive = activeSet.has(n.id);
              const isHover = hover === n.id;
              const isNeighbor = hover != null && adj.get(hover)?.has(n.id);
              const dim = hover != null && !isHover && !isNeighbor;
              const r = isActive ? 10 : 7;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                  style={{ cursor: "pointer", opacity: dim ? 0.25 : 1, transition: "opacity .2s" }}
                  onPointerDown={(e) => onNodePointerDown(e, n)}
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                  onClick={() => onOpenPage(n.id)}
                >
                  {isActive && (
                    <circle r={r + 6} fill={colorFor(n.group)} opacity={0.25}>
                      <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r={r} fill={colorFor(n.group)} stroke={isActive || isHover ? "#141414" : "#ffffff"} strokeWidth={isActive || isHover ? 2 : 1.5} />
                  {isHover && (
                    <text x={0} y={-r - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#141414"
                      stroke="#ffffff" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: "none" }}>
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute bottom-3 right-3 flex gap-1.5">
          <button onClick={() => setView((v) => ({ ...v, k: Math.min(2.5, v.k * 1.2) }))} className="glass h-8 w-8 rounded-lg text-lg leading-none hover:bg-white" aria-label="Zoom in">+</button>
          <button onClick={() => setView((v) => ({ ...v, k: Math.max(0.4, v.k / 1.2) }))} className="glass h-8 w-8 rounded-lg text-lg leading-none hover:bg-white" aria-label="Zoom out">−</button>
          <button onClick={() => fitView(true)} className="glass h-8 px-2 rounded-lg text-xs hover:bg-white">adatta</button>
        </div>
      </div>
    </div>
  );
}
