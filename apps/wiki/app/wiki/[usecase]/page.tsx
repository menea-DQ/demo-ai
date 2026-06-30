import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClientGraph } from "@/lib/graph";
import { getUsecase, listUsecases } from "@/lib/usecases";
import { env } from "@/lib/env";
import { sec, turnstileEnabled } from "@donq/security";
import WikiApp from "@/components/WikiApp";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return listUsecases().map((u) => ({ usecase: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ usecase: string }>;
}): Promise<Metadata> {
  const uc = getUsecase((await params).usecase);
  if (!uc) return { title: "Wiki - Donq" };
  return {
    title: `${uc.companyName} - Knowledge AI · powered by Donq`,
    description: uc.tagline,
    robots: { index: false, follow: false },
  };
}

// Override degli accent della palette per questa azienda (cascata su tutti i figli).
function paletteVars(colors: { rose: string; blue: string; cyan: string }): CSSProperties {
  return {
    ["--color-accent-rose" as string]: colors.rose,
    ["--color-accent-blue" as string]: colors.blue,
    ["--color-accent-cyan" as string]: colors.cyan,
  };
}

export default async function WikiUsecasePage({
  params,
}: {
  params: Promise<{ usecase: string }>;
}) {
  const uc = getUsecase((await params).usecase);
  if (!uc) notFound();

  const graph = getClientGraph(uc.slug);
  return (
    <div style={paletteVars(uc.colors)}>
      <WikiApp
        usecase={{
          slug: uc.slug,
          companyName: uc.companyName,
          assistantName: uc.assistantName,
          suggestions: uc.suggestions,
        }}
        graph={graph}
        turnstileSiteKey={turnstileEnabled ? sec.turnstileSiteKey : ""}
        ctaUrl={env.contactCtaUrl}
        rateLimitMax={sec.rateLimitMax}
        rateWindowMin={Math.round(sec.rateLimitWindowSec / 60)}
        maxQuestionLen={env.maxQuestionLen}
      />
    </div>
  );
}
