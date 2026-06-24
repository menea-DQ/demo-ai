import { getClientGraph } from "@/lib/graph";
import { env, turnstileEnabled } from "@/lib/env";
import WikiApp from "@/components/WikiApp";

export const dynamic = "force-dynamic";

export default function WikiPage() {
  const graph = getClientGraph();
  return (
    <WikiApp
      graph={graph}
      turnstileSiteKey={turnstileEnabled ? env.turnstileSiteKey : ""}
      ctaUrl={env.contactCtaUrl}
      rateLimitMax={env.rateLimitMax}
      rateWindowMin={Math.round(env.rateLimitWindowSec / 60)}
      maxQuestionLen={env.maxQuestionLen}
    />
  );
}
