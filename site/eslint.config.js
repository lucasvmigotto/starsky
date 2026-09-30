import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Design-system invariants (spec.md DS-007, DS-006).
 *
 * A convention nobody can enforce erodes: a raw hex in a component bypasses the
 * palette, and inline prose bypasses the catalogue. Both are invisible in review
 * and impossible to spot by eye once the stylesheet grows.
 */

/** Raw colours belong to the token layer. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGBF = /\brgba?\(/;

const noRawTokenValues = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Raw hex/rgb and magic pixel values belong to the token layer, not to components.",
    },
    schema: [],
    messages: {
      rawColor:
        "Use a design token (site/src/design/tokens.ts), not the literal {{value}}.",
      magicLength:
        "Magic length {{value}} — use a spacing/size token from the design system.",
    },
  },
  create(context) {
    const file = context.filename;
    // The token layer is where literals belong; `index.css` is verified by
    // T012 separately, since it must reference tokens via var().
    //
    // **The poster's render path is exempt, and that is the point.** `spec.ts`
    // mirrors `render-spec.json` verbatim and the renderer emits those colours
    // into the artifact. Those literals are normative (constitution II) and
    // are NOT the interface palette — vision D19 keeps the two independent. A
    // rule that flagged them would be demanding the UI tokens replace the
    // poster's own contract, which is precisely the change DS-008 forbids.
    // Tests assert on literal colour values on purpose — that is the subject
    // under test, not a design decision. Exempt them too.
    const allowed =
      file.endsWith("src/design/tokens.ts") ||
      file.includes("/i18n/") ||
      file.includes("/lib/render/") ||
      file.includes("/render/") ||
      file.includes("contrast.test.ts") ||
      file.includes("/e2e/") ||
      file.endsWith("src/lib/spec.ts");

    return {
      Literal(node) {
        if (allowed) return;
        const value = node.value;
        if (typeof value !== "string") return;
        const raw = String(node.raw ?? value);
        if (HEX.test(raw) || RGBF.test(raw)) {
          context.report({ node, messageId: "rawColor", data: { value: raw } });
        }
        if (/^-?\d+(\.\d+)?px$/.test(value)) {
          context.report({
            node,
            messageId: "magicLength",
            data: { value },
          });
        }
      },
    };
  },
};

/** Prose belongs in `src/i18n`, addressed by a key from the vision. */
const noLiteralCopy = {
  meta: {
    type: "problem",
    docs: {
      description:
        "User-visible copy comes from src/i18n via t(key); prose in a component bypasses the catalogue.",
    },
    schema: [],
    messages: { literalCopy: "User-visible copy must come from t(): {{value}}" },
  },
  create(context) {
    const file = context.filename;
    if (file.includes("/i18n/") || file.includes("design/tokens.ts")) {
      return {};
    }

    /** Prose, as opposed to an id, slug, path or hash. */
    function isProse(value) {
      const v = value.trim();
      if (v.length < 3) return false;
      if (/^#?[a-z0-9-]+$/.test(v)) return false;
      if (/^[./#@]/.test(v)) return false;
      if (/[{}]/.test(v)) return false;
      return /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(v) || /[a-z]\.[a-z]/.test(v);
    }

    const PROSE_PROPS = new Set([
      "title",
      "placeholder",
      "aria-label",
      "alt",
      "label",
      "description",
    ]);

    return {
      JSXText(node) {
        if (isProse(node.value)) {
          context.report({
            node,
            messageId: "literalCopy",
            data: { value: node.value.trim().slice(0, 40) },
          });
        }
      },
      JSXAttribute(node) {
        const name = node.name?.name;
        if (typeof name !== "string" || !PROSE_PROPS.has(name)) return;
        const raw = node.value?.value;
        if (typeof raw === "string" && isProse(raw)) {
          context.report({
            node,
            messageId: "literalCopy",
            data: { value: raw.slice(0, 40) },
          });
        }
      },
    };
  },
};

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
    plugins: {
      design: {
        rules: {
          "no-raw-token-values": noRawTokenValues,
          "no-literal-copy": noLiteralCopy,
        },
      },
    },
    rules: {
      "design/no-raw-token-values": "error",
      // Was "warn" until every user-visible string resolved to a key
      // (000-design-system T027). It is now an error, so a new literal cannot
      // be introduced — which is the whole point of extracting them.
      "design/no-literal-copy": "error",
    },
  },
  {
    // `serve.mjs` is a plain-Node harness for the e2e suite, outside the TS
    // program by design (the Playwright container has no Bun).
    ignores: ["dist/**", "eslint.config.js", "vite.config.ts", "e2e/serve.mjs"],
  },
);