// The footer's versions: starsky (site/package.json, whose X.Y.Z the
// release workflow tags), then the docs site's own (docs/site/package.json),
// each linked to the repository tree it was built from —
// `starsky@v1.2.0 · docs@v1.1.1` on the release tag, `starsky@v1.2.0+abc1234`
// linked to the commit otherwise, plain text without git. Pure: git facts
// in, entries out.
export interface GitInfo {
  /** The release tag on HEAD equal to the product version, or "". */
  exactTag: string;
  /** The version to show past the tag: site/package.json's. */
  lastTag: string;
  sha: string;
}

export interface FooterVersion {
  name: string;
  version: string;
  label: string;
  href: string | null;
}

// `name@vX.Y.Z` (the "v" is display-only), or `name@dev…` before any release.
export function label(name: string, version: string): string {
  return /^\d/.test(version) ? `${name}@v${version}` : `${name}@${version}`;
}

export function footerVersions(opts: {
  repoUrl: string;
  name: string;
  docsVersion: string;
  docsPath: string;
  git: GitInfo;
}): FooterVersion[] {
  const { exactTag, lastTag, sha } = opts.git;
  const short = sha.slice(0, 7);
  const ref = exactTag || sha;
  const project = exactTag || (sha ? `${lastTag || "dev"}+${short}` : lastTag || "dev");
  const docs = exactTag || !sha ? opts.docsVersion : `${opts.docsVersion}+${short}`;
  const tree = ref ? `${opts.repoUrl}/tree/${ref}` : null;
  return [
    { name: opts.name, version: project, label: label(opts.name, project), href: tree },
    {
      name: "docs",
      version: docs,
      label: label("docs", docs),
      href: tree && `${tree}/${opts.docsPath}`,
    },
  ];
}
