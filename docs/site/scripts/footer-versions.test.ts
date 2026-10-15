import { describe, expect, it } from "bun:test";
import { footerVersions } from "./footer-versions.ts";

const base = {
  repoUrl: "https://github.com/o/r",
  name: "r",
  docsVersion: "1.1.1",
  docsPath: "docs/site",
};
const sha = "abc1234def5678";

describe("footerVersions", () => {
  it("links a release build to its tag", () => {
    const v = footerVersions({ ...base, git: { exactTag: "1.2.0", lastTag: "1.2.0", sha } });
    expect(v.map((x) => x.label)).toEqual(["r@v1.2.0", "docs@v1.1.1"]);
    expect(v.map((x) => x.href)).toEqual([
      "https://github.com/o/r/tree/1.2.0",
      "https://github.com/o/r/tree/1.2.0/docs/site",
    ]);
  });

  it("marks an untagged build with its commit, linked to the commit", () => {
    const v = footerVersions({ ...base, git: { exactTag: "", lastTag: "1.2.0", sha } });
    expect(v.map((x) => x.label)).toEqual(["r@v1.2.0+abc1234", "docs@v1.1.1+abc1234"]);
    expect(v[0]?.href).toBe(`https://github.com/o/r/tree/${sha}`);
  });

  it("has no link without git", () => {
    const v = footerVersions({ ...base, git: { exactTag: "", lastTag: "1.2.0", sha: "" } });
    expect(v.map((x) => x.label)).toEqual(["r@v1.2.0", "docs@v1.1.1"]);
    expect(v.every((x) => x.href === null)).toBe(true);
  });
});
