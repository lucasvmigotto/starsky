/**
 * The poster language in links (018-pt-br T005, BCR-0015, BCR-0008).
 *
 * Two promises, tested separately:
 *
 * 1. **Every existing link is untouched.** Real fragments made before 018 —
 *    the five committed samples, the share codec's vector, and an `#e=` and a
 *    `#c=` pinned from the pre-018 encoder — decode with no `lang`, re-encode
 *    to the same bytes, and draw the same SVG. The SVG hashes were captured
 *    from the code *before* any 018 change, with a synthetic model so no sky
 *    data is involved.
 * 2. **`lang` is optional, and only `"pt-BR"`.** Absent means en-US and is how
 *    en-US is written; any other value — `"en-US"` included — is refused in
 *    `#s=`, `#studio=` and `#e=` (never clamped), and dropped as an unreadable
 *    field in the tolerant `#c=`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import { deflate, inflate } from "pako";
import { bytesToBase64Url, canonicalJson, encodePayload } from "./encode.ts";
import { formatDetailLine } from "./caption.ts";
import { decodeCreation, encodeCreation } from "./landing/creation.ts";
import { buildPosterSvg } from "./render/export.ts";
import {
  ShareDecodeError,
  type SharePayload,
  base64UrlToBytes,
  decodeShareFragment,
  posterLocale,
  withPosterLocale,
} from "./share.ts";
import { SAMPLE_FRAGMENTS } from "./site.ts";
import { ExplorerDecodeError, type ExplorerPayload, decodeExplorer, encodeExplorer } from "./sky/payload.ts";
import type { SkyModel, VisibleStar } from "./skymodel.ts";
import { decodeDraft, encodeDraft } from "./studio/draft.ts";

/** The vector `share.test.ts` decodes: a real encoder output. */
const SHARE_VECTOR =
  "eNpVjk1PwzAMhv9K5XNWZYOykSv3cVh3gEsVMtN6pElJXKox7b_jjg8JyZKtx6_s5wzeMphbXa6rjQIfA5jF-qa831SVgjgwxZDBnMFJZ_SSFtJ4-4JeOKcR1f_dH32l3OEJm8wJQ8sdmGWpFbQ-Tr-ReW4oMIZMfPoJ9LYNxOMBG089iVxVillPock42HR9AkaXWgseUjyi-0YgEgljm-zQkQMFubMDCneUnEcBTOxn8DimYkttx3CRE966GdbUYy5276NNqIotTsVTTG-q2IsNHoodW8Y8H_mU8L5-kPFDlBVMHYZmZCd4pVd3C72UqrU213qGyxfuaHRl";

/** sha256 of `buildPosterSvg(sample, MODEL, 800)`, captured before 018. */
const SAMPLE_SVG_SHA256 = [
  "86beb7ba367e56d7e90a76f6df3e5c041e73aad3ed26682230271f13f8028ee7",
  "1744a50d9c9f723913d89e66710220c6409bc1cc3fe86ef01ac1969748d6ac2f",
  "370b14d0284ede30443b304ad751c4882af3cd1317d1b34a957398e229527807",
  "1ffd0c7c8301b49ec3103f1fe287c078915699f7a0482c12ebb1b126b79a9dc3",
  "046c8d0a18ba3cd3b40ee2c92fcc036a690107c3ebed1cc207497a7f4d4fcbd5",
];

/** An `#e=` fragment from the pre-018 encoder (Times Square, Sirius selected). */
const PINNED_EXPLORER =
  "eNo1TssKwkAM_BWZ83ZJu1Zrrl70JlgvikhtVy3stvalqPjvpgdhApkXyQeX-gE2pEnBZT14SnoeJyN52bYDf3C2rn6CUZTe2wJf8eoKHMyNXiRxrOCzK3imZbu7LLcSTUtvu8m2GbLWQqEBH8YL_wk1HRU66yS6Wm_YRGa6kFxf9k7q1eCckLe4u3QpunwYKjxvtjoNfS5yRNEsoFCQUsxEgj2-PwKIN6w";

/** A `#c=` fragment from the pre-018 encoder (a full landing form). */
const PINNED_CREATION =
  "eNoVykEOgjAQheGrkFkXHNAKducF3MiGFZngRBunoLVIovHuDsnbvC__F4QSuB0WtW0MyDSCy-ttcWisNRDoOvo0X7gXH7x2ttDoITQwOGh94Fd2fs4UGQwkn2TlEy9ZxxRX-ug_Bo5-oI16303xrv4GVxpYbjz2Mg0kWlVY7XMsdS2iQ4TfHyqkLe0";

function star(o: Partial<VisibleStar> = {}): VisibleStar {
  return { hip: 1, raDeg: 10, decDeg: 20, mag: 1, unitX: 0, unitY: 0, px: 400, py: 400, size: 14, ...o };
}

const MODEL: SkyModel = {
  stars: [
    star(),
    star({ hip: 2, unitX: 0.2, unitY: -0.3, mag: 3.5, size: 5.6 }),
    star({ hip: 3, unitX: -0.5, unitY: 0.4, mag: 4.9, size: 2 }),
  ],
  figures: [
    { abbr: "ORI", name: "Orion", starIndices: [0, 1], centroidX: 400, centroidY: 400, brightestMag: 1, brightestHip: 1 },
  ],
  segments: [
    { a: 0, b: 1, figure: 0 },
    { a: 1, b: 2, figure: 0 },
  ],
  when: new Date("2026-01-01T00:00:00Z"),
};

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

/** Encode any JSON document with the links' codec, so a test can write what no encoder would. */
function rawFragment(document: unknown): string {
  return bytesToBase64Url(deflate(new TextEncoder().encode(canonicalJson(document)), { level: 9, legacyHash: true }));
}

/** The JSON document inside a fragment, as written. */
function inflated(fragment: string): Record<string, unknown> {
  return JSON.parse(inflate(base64UrlToBytes(fragment), { toText: true })) as Record<string, unknown>;
}

const SHARE: SharePayload = decodeShareFragment(SHARE_VECTOR);

describe("existing links keep their bytes and their poster (US3)", () => {
  const pinned = [...SAMPLE_FRAGMENTS, SHARE_VECTOR];

  it("decode with no lang, and re-encode byte for byte as #s= and as #studio=", () => {
    for (const fragment of pinned) {
      const payload = decodeShareFragment(fragment);
      expect("lang" in payload).toBe(false);
      expect(posterLocale(payload)).toBe("en-US");
      expect(encodePayload(payload)).toBe(fragment);
      expect(encodeDraft(decodeDraft(fragment))).toBe(fragment);
    }
  });

  it("draw the same SVG as before 018", () => {
    SAMPLE_FRAGMENTS.forEach((fragment, index) => {
      const svg = buildPosterSvg(decodeShareFragment(encodePayload(decodeShareFragment(fragment))), MODEL, 800);
      expect(sha(svg)).toBe(SAMPLE_SVG_SHA256[index] ?? "");
    });
  });

  it("keep the en-US caption", () => {
    const p = decodeShareFragment(SAMPLE_FRAGMENTS[0] ?? "");
    const svg = buildPosterSvg(p, MODEL, 800);
    expect(svg).toContain(formatDetailLine(p.lat, p.lon, p.place, p.when_utc, p.tz, "en-US"));
  });

  it("#e= and #c= links re-encode byte for byte, with no lang", () => {
    const explorer = decodeExplorer(PINNED_EXPLORER);
    expect("lang" in explorer).toBe(false);
    expect(encodeExplorer(explorer)).toBe(PINNED_EXPLORER);

    const creation = decodeCreation(PINNED_CREATION);
    if (creation.status !== "ok") throw new Error("the pinned #c= did not decode");
    expect("lang" in creation.creation).toBe(false);
    expect(encodeCreation(creation.creation)).toBe(PINNED_CREATION);
  });
});

describe("#s= and #studio= lang (US2, FR-005)", () => {
  it("never writes en-US: an en-US poster has no lang key at all", () => {
    const en = withPosterLocale({ ...SHARE, lang: "pt-BR" }, "en-US");
    expect("lang" in en).toBe(false);
    expect(encodePayload(en)).toBe(SHARE_VECTOR);
    expect(inflated(encodePayload(en))).not.toHaveProperty("lang");
  });

  it("writes pt-BR as a top-level field, and reads it back", () => {
    const pt = withPosterLocale(SHARE, "pt-BR");
    const fragment = encodePayload(pt);
    expect(inflated(fragment)["lang"]).toBe("pt-BR");
    expect(decodeShareFragment(fragment).lang).toBe("pt-BR");
    expect(decodeDraft(encodeDraft(pt)).lang).toBe("pt-BR");
    expect(posterLocale(decodeShareFragment(fragment))).toBe("pt-BR");
  });

  it("draws the pt-BR date on the poster, and nothing else changes", () => {
    const pt = withPosterLocale(SHARE, "pt-BR");
    const svg = buildPosterSvg(pt, MODEL, 800);
    expect(svg).toContain(formatDetailLine(pt.lat, pt.lon, pt.place, pt.when_utc, pt.tz, "pt-BR"));
    expect(svg).not.toContain(formatDetailLine(pt.lat, pt.lon, pt.place, pt.when_utc, pt.tz, "en-US"));
  });

  for (const bad of ["en-US", "pt", "pt-PT", "fr-FR", "", null, 1, ["pt-BR"]]) {
    it(`refuses lang ${JSON.stringify(bad)} rather than clamping it (BCR-0008)`, () => {
      const fragment = rawFragment({ ...SHARE, lang: bad });
      expect(() => decodeShareFragment(fragment)).toThrow(ShareDecodeError);
      expect(() => decodeDraft(fragment)).toThrow(ShareDecodeError);
    });
  }
});

describe("#e= lang (US4)", () => {
  const base = decodeExplorer(PINNED_EXPLORER);

  it("carries pt-BR and omits anything else on the way out", () => {
    const pt: ExplorerPayload = { ...base, lang: "pt-BR" };
    expect(decodeExplorer(encodeExplorer(pt)).lang).toBe("pt-BR");
    expect(inflated(encodeExplorer(pt))["lang"]).toBe("pt-BR");
  });

  for (const bad of ["en-US", "pt", "", null]) {
    it(`refuses lang ${JSON.stringify(bad)}`, () => {
      expect(() => decodeExplorer(rawFragment({ ...base, lang: bad }))).toThrow(ExplorerDecodeError);
    });
  }
});

describe("#c= lang (US4, tolerant per field)", () => {
  it("carries pt-BR", () => {
    const decoded = decodeCreation(encodeCreation({ lat: 1, lon: 2, lang: "pt-BR" }));
    if (decoded.status !== "ok") throw new Error("a pt-BR #c= must decode");
    expect(decoded.creation.lang).toBe("pt-BR");
  });

  for (const bad of ["en-US", "pt", "", null, 7]) {
    it(`drops lang ${JSON.stringify(bad)} and keeps the rest of the form`, () => {
      const decoded = decodeCreation(rawFragment({ v: 1, lat: 1, lon: 2, title: "Kept", lang: bad }));
      if (decoded.status !== "ok") throw new Error("a bad lang must not refuse the whole link");
      expect(decoded.creation.title).toBe("Kept");
      expect("lang" in decoded.creation).toBe(false);
    });
  }
});

describe("the landing carries a #c= language to #e= (US4)", () => {
  it("keeps it in its own #c= and hands it to the Explorer", async () => {
    const { createInitialState, creationOf, toLandingInput } = await import("./landing/state.ts");
    const { exploreHash } = await import("./landing/payload.ts");
    const state = createInitialState({ now: new Date("2026-01-01T00:00:00Z"), zone: "UTC", creation: { lat: 1, lon: 2, lang: "pt-BR" } });
    expect(creationOf(state).lang).toBe("pt-BR");
    const input = toLandingInput(state);
    if (!input.ok) throw new Error("the form is valid");
    const hash = exploreHash(input.value);
    if (!hash.ok) throw new Error("the form builds");
    expect(decodeExplorer(hash.value.slice(3)).lang).toBe("pt-BR");
  });

  it("writes no lang when none arrived", async () => {
    const { createInitialState, creationOf } = await import("./landing/state.ts");
    const state = createInitialState({ now: new Date("2026-01-01T00:00:00Z"), zone: "UTC" });
    expect("lang" in creationOf(state)).toBe(false);
  });
});
