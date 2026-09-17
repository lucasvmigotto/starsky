/**
 * Sample moment (Times Square, 2026-01-01) so the explorer opens to a
 * real sky when there is no `#s=` link. Generated with the repo encoder;
 * see `src/lib/share.test.ts` for the vector provenance.
 */
export const SAMPLE_FRAGMENT =
  "eNpVjk1PwzAMhv9K5XNWZYOykSv3cVh3gEsVMtN6pElJXKox7b_jjg8JyZKtx6_s5wzeMphbXa6rjQIfA5jF-qa831SVgjgwxZDBnMFJZ_SSFtJ4-4JeOKcR1f_dH32l3OEJm8wJQ8sdmGWpFbQ-Tr-ReW4oMIZMfPoJ9LYNxOMBG089iVxVillPock42HR9AkaXWgseUjyi-0YgEgljm-zQkQMFubMDCneUnEcBTOxn8DimYkttx3CRE966GdbUYy5276NNqIotTsVTTG-q2IsNHoodW8Y8H_mU8L5-kPFDlBVMHYZmZCd4pVd3C72UqrU213qGyxfuaHRl";

/** Full-app deep-link target, configurable at build time. */
const configured: unknown = import.meta.env["VITE_FULL_APP_URL"];
export const FULL_APP_URL =
  typeof configured === "string" && configured.length > 0
    ? configured
    : "https://huggingface.co/spaces/lucasvmigotto/starpy";
