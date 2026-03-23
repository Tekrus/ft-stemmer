export const config = {
  oda: {
    baseUrl: process.env.ODA_BASE_URL ?? "https://oda.ft.dk/api",
    requestDelayMs: Number(process.env.ODA_REQUEST_DELAY_MS ?? 100),
  },
  revalidate: {
    dashboard: Number(process.env.REVALIDATE_DASHBOARD ?? 1800),
    voteDetail: Number(process.env.REVALIDATE_VOTE_DETAIL ?? 3600),
  },
  cache: {
    odaTtl: Number(process.env.ODA_CACHE_TTL ?? 1800),
    odaTtlHistorical: Number(process.env.ODA_CACHE_TTL_HISTORICAL ?? 86400),
  },
  pagination: {
    defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 15),
  },
  ai: {
    model: process.env.AI_MODEL ?? "gemini-2.0-flash",
  },
}
