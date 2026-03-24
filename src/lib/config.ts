export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 50),
  },
  cache: {
    /** TTL for list/search queries (seconds). Individual records use TTL 0 (permanent). */
    odaTtlList: Number(process.env.ODA_CACHE_TTL ?? 10800),
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 15),
  },
  ai: {
    modelOverride: process.env.AI_MODEL ?? null,
  },
}
