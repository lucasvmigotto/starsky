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
    // `serve.mjs` is a plain-Node harness for the e2e suite, outside the TS
    // program by design (the Playwright container has no Bun).
    ignores: ["dist/**", "eslint.config.js", "vite.config.ts", "e2e/serve.mjs"],
  },
);
