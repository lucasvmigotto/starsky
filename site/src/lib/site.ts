/**
 * Curated sample moments so visitors can wander a real sky with one click.
 * Each fragment was generated with the repo encoder
 * (`starpy.share.spec.encode_payload`) from default render options; only
 * moment/place/title vary. Mix of titled and untitled moments, both
 * hemispheres.
 */
export const SAMPLE_FRAGMENTS: readonly string[] = [
  // Times Square, New York — 2026-01-01 00:00 EST ("New Year over Manhattan").
  "eNpVj89OwzAMh18l8jkr2aBs9MYDwGXjAJfIZF4bSJOSuJvGtHfHHX8kJEuOvnx2fjlBQIbmxlTLeqUhpAjNbHld3a3qWkMa2KdYoDmBk84UxBZiA75SEM55JP3_7o_ufOnoSLZwpthyB828MhrakA6_ynS2PjLF4vn4I_TYRs_jlmzwvZdwdSXJeh9toQHz5RFoTGWM4CGnN3LfCCREptRmHDrvQEPpcCDhzmcXSAB7DhN4pIN6Jswq7SmrB4wdMmOEsywM6CZl43sqav0xYiatLgMpv2v1JNloq9aMTGVa-SnyfU_ZO7wSzU6a8L38RsOho2hHduIszOJ2ZuZSG1M3xki9wPkLfUV-sA",
  // Sydney, Australia — 2025-12-25 22:00 AEDT (untitled southern sky).
  "eNpVjtFKxDAQRX-lzHNa05bK2jd_wJcVBF9KzI5tZJqUZGKpy_67U1cXhMCEM_cm5wxkGPqybavD_eGggIKHvu7qqtEPrYKwsAs-QX8GK5ORJC9kIPOGJJxjRvV_d6PvLk244ZA4oh95kocrrWCksP5F9vvgPKNPjrffwGxG7zifcCA3O9HrKjGbnR8SLib-fAK9rrQWvMTwgfaKQCQihjGaZXIWFKTJLCjcumgJBbBjmb3PRBfpkrH7-ridPG6qeMK1OIbMU_FiCJMqHrO4G3Jmr35J8gburh3hn2KtYJ3QD5mtZBrddGXdlE33XNe91nJe4fINTjB3cg",
  // Reykjavik, Iceland — 2025-12-21 23:00 GMT ("Longest night").
  "eNpVkE9rwzAMxb9K0dnNnCwNm289DnYaO-0SPFdz1Lp2sJWWrPS7T9mfwsAg6_ee7IcuECyD6dqqbrtOQUgRzLqpq8e2kTaNTCkWMBdwUhmD2IX0wb5jEM55QvVfu9EPKgPO2BfOGD0PYOpKK_Ahnf8sy72nyBgL8fxrOFofiacd9oGOJOk21YNQin3B0ebvT8DoSmvBY057dD8IJETG5LMdB3KgoAx2ROGOsgsogInDAp5T9Fh4FckPDFd5Jli3CC84H_b2RAe1enIYbNwtU5-ibFk6Jnd3s4hyksgKzgPGfmInrkY3m3XdyAZfm3ujtZw3uH4Bg3Z2EQ",
  // Giza, Egypt — 2025-08-12 23:30 EEST, Perseids (untitled).
  "eNpVzk1OwzAQBeCroFmnwXGoaLxDCHEBVmwsY6bJVK5t2ROqtOrdmfAnsRr7e8_yXCA4BqOHdrgfdAMhRTB913b9ndxSZkqxgrmAl8kYpC1ig3vDIM5lxuZ_9qd7qhMuaCsXjCNPYLpWNTCGdPqtrGdLkTFW4uWncHRjJJ7f0QY6kiy3bXeiFG3F7MrXJ2BUq5RwLumA_ptAliiYxuLyRB4aqJPLKO6p-IACTCzTxDmEq7wNzq_xM51dc_M0LpnXzlnoYV_Iu9tHRyWJfchqDZwmjHZmL7lWertRu02nX7QyvTJKvcL1Ew9DbNM",
  // Heritage sample: Nagahama, Japan — 1998-11-17 11:17 JST ("The most important rainy day").
  "eNpVjr1uwzAMhF_F4Oy4UoIkrreuHbo0UxeDdViLrSwJEtPADfLupfsHdCLx3fF4F_Ao0G22zaY17c62NfgYoLObXbPet1uzUxKTcAwFugsMOoW8HinpPT6TVy75RPV_7Y--cHE0U18kUxjFaXZjahh9PP9alr3nIBQKy_xjmHAMLKcj9Z4n1o7bRqtMHPpCCfPXE-hMY4zilOMrDd8ItESmOGZMjgeooThMpHzgPHhSICx-AQdH1RSLVDylmAWDVBk5zNURZ7hqqsdh8T3giA4nrKtHx6OOe0wYlqAPVe8K480hvs1Rybu2r-HsKPQnGVS1t7ftytqV3R_MurP7zpgnuH4CphZ6hQ",
];

/** Uniform random pick; avoids `exclude` (current sky) when alternatives exist. */
export function randomSampleFragment(exclude: string | null = null): string {
  const pool =
    exclude && SAMPLE_FRAGMENTS.length > 1
      ? SAMPLE_FRAGMENTS.filter((f) => f !== exclude)
      : SAMPLE_FRAGMENTS;
  const list = pool.length > 0 ? pool : SAMPLE_FRAGMENTS;
  if (list.length === 0) return "";
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * The site's own public base URL, used for absolute OG/Twitter image URLs.
 * CI sets `VITE_FULL_APP_URL` from the `STARPY_STATIC_SITE_URL` repository
 * variable; the placeholder below is only a local-build default and is
 * asserted away in CI ("Assert absolute OG tags").
 */
const configured: unknown = import.meta.env["VITE_FULL_APP_URL"];
export const FULL_APP_URL =
  typeof configured === "string" && configured.length > 0
    ? configured
    : "http://localhost:5173";
