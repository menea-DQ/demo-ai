import { getClientGraph } from "@/lib/graph";
import { env } from "@/lib/env";
import { sec, turnstileEnabled } from "@donq/security";
import WikiApp from "@/components/WikiApp";

export const dynamic = "force-dynamic";

export default function WikiPage() {
  const graph = getClientGraph();
  return (
    <WikiApp
      graph={graph}
      turnstileSiteKey={turnstileEnabled ? sec.turnstileSiteKey : ""}
      ctaUrl={env.contactCtaUrl}
      rateLimitMax={sec.rateLimitMax}
      rateWindowMin={Math.round(sec.rateLimitWindowSec / 60)}
      maxQuestionLen={env.maxQuestionLen}
    />
  );
}
