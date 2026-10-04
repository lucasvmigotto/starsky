import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Plain-JS harness + Playwright config: outside the TS program by
    // design (the Playwright container has no Bun for type-aware lint).
    ignores: [
      "dist/**",
      "eslint.config.js",
      "vite.config.ts",
      "playwright.config.ts",
      "e2e/serve.mjs",
    ],
  },
);
