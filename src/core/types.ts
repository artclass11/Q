export interface PolicyConfig {
  deny?: string[];
  allow?: string[];
  maxBytes?: number;
  maxResults?: number;
}

export interface SourceDocument {
  id: string;
  path: string;
  sha256: string;
  bytes: number;
  content: string;
}

export interface SearchHit {
  source: Pick<SourceDocument, "id" | "path" | "sha256" | "bytes">;
  score: number;
  excerpt: string;
}

export interface ContextPack {
  version: "1";
  question: string;
  generatedAt: string;
  sources: SearchHit[];
}
