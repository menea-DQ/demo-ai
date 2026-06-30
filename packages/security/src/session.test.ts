import { describe, it, expect, vi } from "vitest";
import {
  createSessionToken,
  issueTokenForSid,
  verifySessionToken,
} from "./session";

describe("@donq/security sessione firmata", () => {
  describe("round-trip (invariante 1)", () => {
    it("createSessionToken() -> verify restituisce lo stesso sid", () => {
      const { sid, token } = createSessionToken();
      expect(sid).toBeTruthy();
      expect(token).toContain(".");
      expect(verifySessionToken(token)).toBe(sid);
    });

    it("issueTokenForSid(s) -> verify restituisce s", () => {
      const s = "sid-arbitrario-123";
      const token = issueTokenForSid(s);
      expect(verifySessionToken(token)).toBe(s);
    });

    it("createSessionToken() genera sid distinti a chiamate successive", () => {
      const a = createSessionToken().sid;
      const b = createSessionToken().sid;
      expect(a).not.toBe(b);
    });
  });

  describe("input mancante o malformato -> null (invariante 2)", () => {
    it("undefined -> null", () => {
      expect(verifySessionToken(undefined)).toBeNull();
    });

    it("null -> null", () => {
      expect(verifySessionToken(null)).toBeNull();
    });

    it("stringa vuota -> null", () => {
      expect(verifySessionToken("")).toBeNull();
    });

    it("stringa senza separatore -> null", () => {
      expect(verifySessionToken("nessunpunto")).toBeNull();
    });

    it("stringa con numero di parti errato (3 segmenti) -> null", () => {
      expect(verifySessionToken("a.b.c")).toBeNull();
    });
  });

  describe("firma manomessa (invariante 3)", () => {
    it("sostituendo la sola firma con stringa arbitraria -> null", () => {
      const { token } = createSessionToken();
      const [body] = token.split(".");
      const tampered = `${body}.firmafarlocca`;
      expect(verifySessionToken(tampered)).toBeNull();
    });
  });

  describe("payload manomesso (invariante 4)", () => {
    it("sostituendo il body con quello di un altro token, mantenendo la vecchia firma -> null", () => {
      const tokenA = issueTokenForSid("sid-A");
      const tokenB = issueTokenForSid("sid-B");
      const sigA = tokenA.split(".")[1];
      const bodyB = tokenB.split(".")[0];
      const frankenstein = `${bodyB}.${sigA}`;
      expect(verifySessionToken(frankenstein)).toBeNull();
    });
  });

  describe("token scaduto (invariante 5)", () => {
    it("emissione molto nel passato (oltre TTL 1800s) -> null", () => {
      // ponytail: non conosco l'encoding del body, quindi non posso forgiare
      // un timestamp passato a mano senza la firma valida. Uso fake timers per
      // emettere un token "nel passato" e poi avanzare oltre il TTL di default.
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
        const token = issueTokenForSid("sid-vecchio");
        // appena emesso, deve essere valido
        expect(verifySessionToken(token)).toBe("sid-vecchio");
        // avanza oltre il TTL di default (1800s) + margine
        vi.advanceTimersByTime((1800 + 10) * 1000);
        expect(verifySessionToken(token)).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
