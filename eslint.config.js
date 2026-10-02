import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

const HTML_INJECTION = "Chat text is hostile input: render it as React elements (CLAUDE.md).";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "playwright-report",
      "test-results",
      // Local AI tool skill packs, also in .gitignore
      ".agents",
      ".codex",
      ".claude",
      ".github/skills",
      ".github/agents",
      ".github/hooks",
      "Claude outputs",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: HTML_INJECTION },
        {
          selector: "AssignmentExpression > MemberExpression[property.name=/^(inner|outer)HTML$/]",
          message: HTML_INJECTION,
        },
        {
          selector: "CallExpression > MemberExpression[property.name='insertAdjacentHTML']",
          message: HTML_INJECTION,
        },
      ],
    },
  },
  prettier,
);
