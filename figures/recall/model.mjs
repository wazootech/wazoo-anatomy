// The pure model behind the recall figure. Every number the figure shows is
// computed here: the two retriever rankings, the reciprocal rank fusion that
// merges them, and the traversal that turns the winning chunk into a literal.
//
// Truth sources: wazootech/worlds-sdk-ts —
//   src/client/search-index/rrf-score.ts      DEFAULT_RRF_K = 60, 1/(k+rank)
//   src/client/search-index/search-index-interface.ts  chunk/score contract
//   AGENTS.md                                 "hybrid search … search-then-SPARQL"

export const K = 60; // DEFAULT_RRF_K
export const K_LABEL = "k = 60";

export const QUERY = "the capital of France";

// Candidate chunks. A chunk is one quad flattened for search: its fts_value is
// "subject local name, predicate phrase, literal, label aliases" and its vector
// embeds a deduplicated union of fts_value and value (AGENTS.md).
export const CHUNKS = [
  { id: "ch-france-capital", subject: "France", predicate: "capital", answer: "Paris", text: "France · capital · Paris" },
  { id: "ch-france-country", subject: "France", predicate: "instance of", answer: "country", text: "France · instance of · country" },
  { id: "ch-paris-seine", subject: "Paris", predicate: "crosses", answer: "the Seine", text: "Paris · crosses · the Seine" },
  { id: "ch-paris-population", subject: "Paris", predicate: "population", answer: "2.1 million", text: "Paris · population · 2.1 million" },
  { id: "ch-paris-eiffel", subject: "Paris", predicate: "landmark", answer: "Eiffel Tower", text: "Paris · landmark · Eiffel Tower" },
  { id: "ch-paris-louvre", subject: "Paris", predicate: "museum", answer: "the Louvre", text: "Paris · museum · the Louvre" },
  { id: "ch-france-europe", subject: "France", predicate: "continent", answer: "Europe", text: "France · continent · Europe" },
];

// Keyword ranking: FTS5/BM25 over chunks.fts_value (best first).
export const KEYWORD_RANK = [
  "ch-france-capital",
  "ch-france-country",
  "ch-paris-seine",
  "ch-france-europe",
  "ch-paris-population",
  "ch-paris-eiffel",
  "ch-paris-louvre",
];

// Vector ranking: cosine over the chunk embeddings (best first).
export const VECTOR_RANK = [
  "ch-paris-seine",
  "ch-france-capital",
  "ch-paris-population",
  "ch-paris-louvre",
  "ch-paris-eiffel",
  "ch-france-country",
  "ch-france-europe",
];

const byId = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
const rankOf = (list, id) => {
  const at = list.indexOf(id);
  return at < 0 ? null : at + 1; // 1-based rank; absent from a list is null
};

// One list's contribution to an item: 1 / (k + rank); 0 when the item is absent.
export const contribution = (rank) => (rank == null ? 0 : 1 / (K + rank));

// Worlds normalizes each rank to the API contract scale with k/(k+rank).
export const normalizeRrfScore = (rank, k = K) => k / (k + rank);

export function fuse() {
  return CHUNKS.map((chunk) => {
    const keywordRank = rankOf(KEYWORD_RANK, chunk.id);
    const vectorRank = rankOf(VECTOR_RANK, chunk.id);
    const keyword = contribution(keywordRank);
    const vector = contribution(vectorRank);
    return { ...chunk, keywordRank, vectorRank, keyword, vector, score: keyword + vector };
  }).sort((a, b) => b.score - a.score || (a.keywordRank ?? 99) - (b.keywordRank ?? 99));
}

// The fused list, the winning chunk, and the exact traversal it names.
export const FUSED = fuse();
export const WINNER = FUSED[0];
export const HOPS = [
  { predicate: "subject", value: WINNER.subject, note: "the chunk names its subject IRI" },
  { predicate: WINNER.predicate, value: WINNER.answer, note: "SPARQL traverses the predicate to the literal" },
];

export const START = 1; // the carriage starts parked on ranked chunk #1
export const READOUT = (item) =>
  `${item.subject} · ${item.predicate} · ${item.answer} — k#${item.keywordRank ?? "–"} v#${item.vectorRank ?? "–"} · rrf ${item.score.toFixed(4)}`;
