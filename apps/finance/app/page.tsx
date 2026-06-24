import { sec, turnstileEnabled } from "@donq/security";
import { env } from "@/lib/env";
import FinanceApp from "@/components/FinanceApp";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <FinanceApp
      turnstileSiteKey={turnstileEnabled ? sec.turnstileSiteKey : ""}
      ctaUrl={env.contactCtaUrl}
      rateLimitMax={sec.rateLimitMax}
      rateWindowMin={Math.round(sec.rateLimitWindowSec / 60)}
    />
  );
}
