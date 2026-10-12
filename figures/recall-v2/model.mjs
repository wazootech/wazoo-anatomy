// The pure model behind the "recall by agreement" figure. Same truth as the
// recall figure — the two retriever rankings and the reciprocal rank fusion
// that merges them — because the experiment is about the machine, not the data.
//
// Truth sources: wazootech/worlds-sdk-ts —
//   src/client/search-index/rrf-score.ts      DEFAULT_RRF_K = 60, 1/(k+rank)
//   src/client/search-index/search-index-interface.ts  chunk/score contract

export const K = 60; // DEFAULT_RRF_K

// Candidate chunks: one quad flattened for search.
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

export function fuse() {
  return CHUNKS.map((chunk) => {
    const keywordRank = rankOf(KEYWORD_RANK, chunk.id);
    const vectorRank = rankOf(VECTOR_RANK, chunk.id);
    const keyword = contribution(keywordRank);
    const vector = contribution(vectorRank);
    return { ...chunk, keywordRank, vectorRank, keyword, vector, score: keyword + vector };
  }).sort((a, b) => b.score - a.score || (a.keywordRank ?? 99) - (b.keywordRank ?? 99));
}

// The fused list and its winner: the answer both witnesses vouch for.
export const FUSED = fuse();
export const WINNER = FUSED[0];

export const READOUT = (item) =>
  `${item.subject} · ${item.predicate} · ${item.answer} — k#${item.keywordRank ?? "–"} v#${item.vectorRank ?? "–"} · rrf ${item.score.toFixed(4)}`;
