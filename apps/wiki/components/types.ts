import type { Citation, ClientGraph, PageType, RelatedRef } from "@/lib/types";

export interface RetrievedRef {
  pageId: string;
  title: string;
  category: string;
  type: PageType;
  viaGraph: boolean;
}

export type MessageStatus = "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  citations?: Citation[];
  related?: RelatedRef[];
  retrieved?: RetrievedRef[];
}

/** Bersaglio di navigazione verso una pagina del wiki. */
export interface DocTarget {
  pageId: string;
  /** estratto verbatim da evidenziare */
  quote?: string;
  /** id di un'intestazione interna a cui scrollare */
  headingId?: string;
  /** nonce per forzare scroll/highlight anche su stesso target */
  nonce: number;
}

export type { ClientGraph, Citation, RelatedRef, PageType };
