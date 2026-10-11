// The pure model behind the ingestion figure. Every value the figure shows is
// computed here: one quad, the textual-literal filter, the flattened fts_value
// and the embedding text, the content hash the idempotency guard compares, and
// the six hexastore orderings the quad is filed under.
//
// Truth sources: wazootech/worlds-sdk-ts — AGENTS.md —
//   "Idempotency guard"            interceptor checking store state before mutating
//   "Textual literal"              only textual strings enter the search index
//   "Search index internals"       fts_value = subject name + predicate phrase +
//                                  literal + label aliases; value = the literal
//   "Graph store"                  durable backends query a persistent hexastore
//   "Label predicates"             rdfs:label / skos:prefLabel / schema:name

// The quad arriving at the press: subject, predicate, textual literal, graph.
export const QUAD = {
  subject: "France",
  subjectIRI: "https://wazoo.dev/ex/France",
  predicate: "capital",
  predicateIRI: "https://wazoo.dev/ex/capital",
  literal: "Paris",
  datatype: "xsd:string",
  graph: "geo",
  graphIRI: "https://wazoo.dev/graph/geo",
};

// A second quad that carries a structured primitive. It is stored in the
// hexastore but deliberately produces no search chunk (AGENTS.md, "Textual
// literal": numeric, boolean and timestamp literals are excluded).
export const NUMERIC = {
  subject: "Paris",
  predicate: "population",
  literal: "2,102,650",
  datatype: "xsd:integer",
  textual: false,
};

// A label predicate is always indexed; its commit fans out, so sibling rows
// pick up the new alias token (AGENTS.md, "Label predicates").
export const ALIAS = { predicate: "rdfs:label", value: "French Republic" };

// chunks.fts_value: subject local name, predicate phrase, the literal, and the
// label aliases — in that order.
export const FTS_TOKENS = [QUAD.subject, QUAD.predicate, QUAD.literal, ALIAS.value];
export const FTS_VALUE = FTS_TOKENS.join(" · ");

// chunks.value is the object literal returned to callers as SearchResult.text.
export const VALUE = QUAD.literal;

// The vector embeds a deduplicated union of fts_value and value, keyed by
// fts_value. "Paris" already appears, so the union adds nothing.
export const VECTOR_TEXT = [...new Set([...FTS_TOKENS, VALUE])].join(" ");

// The idempotency guard compares a content hash before emitting a mutation; a
// second copy of the same quad is suppressed, so nothing is re-written.
export const contentHash = (quad) => {
  const text = [quad.subject, quad.predicate, quad.literal, quad.graph].join("|");
  let hash = 5381;
  for (let index = 0; index < text.length; index++) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(8, "0");
};
export const HASH = contentHash(QUAD);

// The quad is filed under every ordering of subject, predicate and object;
// the graph is appended. Durable backends query these persistent indexes.
const permutations = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
export const PERMUTATIONS = permutations(["S", "P", "O"]).map((order) => [...order, "G"].join(""));

// The stages of one ingest, in order.
export const STEPS = [
  { id: "arrive", label: "the quad arrives", detail: `${QUAD.subject} · ${QUAD.predicate} · ${QUAD.literal}` },
  { id: "filter", label: "textual-literal filter", detail: `xsd:string passes · ${NUMERIC.datatype} is stored but not indexed` },
  { id: "guard", label: "idempotency guard", detail: `content hash ${HASH} not already in the store` },
  { id: "flatten", label: "flatten to fts_value", detail: FTS_VALUE },
  { id: "file", label: "file under six orderings", detail: PERMUTATIONS.join("  ") },
];

export const READOUT = (step) => `${step.label} — ${step.detail}`;
