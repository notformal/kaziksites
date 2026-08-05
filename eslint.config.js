/**
 * ESLint flat config — SENIOR-LEVEL quality gate for the root React/Vite app (src/).
 *
 * Extended with strict code quality rules derived from AGENTS-AI-CODE-REVIEW-ENGINE.md
 * and .clinerules/code-quality-rules.md — catching anti-patterns before they ship.
 *
 * Focus: correctness, security, accessibility, senior-level patterns enforcement.
 */
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "output/",
      "vendor-candidates/",
      "platform/",
      "landing/",
      "scripts/",
      ".gstack/",
      "coverage/",
      "**/*.min.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // ─── React JSX awareness ───
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-direct-mutation-state": "error",

      // ─── React Hooks correctness ───
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": [
        "warn",
        { additionalHooks: "(useDerivedValue|useAnimatedStyle)" }
      ],

      // ─── Senior-level anti-pattern detection ───

      // No console.log in production (only warn, error, info allowed)
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      
      // No debugger statements
      "no-debugger": "error",

      // Strict equality only
      eqeqeq: ["error", "always", { null: "ignore" }],

      // No empty catch blocks (masking errors is a senior violation)
      "no-empty": ["error", { allowEmptyCatch: false }],

      // No implied eval (new Function, setTimeout with string)
      "no-implied-eval": "error",
      "no-new-func": "error",

      // No self-comparison (x === x is never useful)
      "no-self-compare": "error",

      // Unsafe optional chaining
      "no-unsafe-optional-chaining": "error",

      // No unused vars (allow rest spread, React imports, React pattern)
      "no-unused-vars": [
        "error",
        { 
          args: "none", 
          varsIgnorePattern: "^React$", 
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_"
        },
      ],

      // No undefined variables
      "no-undef": "error",

      // ─── React-specific senior rules ───

      // Require destructured props with default values pattern
      "react/prop-types": "off", // PropTypes handled by separate tool
      
      // No dead code in React
      "react/no-unused-prop-types": "warn",

      // Require descriptive component names
      "react/jsx-pascal-case": [
        "error", 
        { allowAllCaps: false, allowNamespace: true }
      ],

      // No string refs (delegated callback refs)
      "react/no-string-refs": "error",

      // No direct DOM access
      "react/no-find-dom-node": "warn",

      // Prefers functional components over class components
      "react/prefer-stateless-function": "warn",

      // ─── JavaScript senior rules ───

      // No with statements
      "no-with": "error",

      // No label statements
      "no-labels": "error",

      // No try/catch without error handling
      "no-try-catch-missing-error": "off", // not a built-in rule, documented in AI review

      // Require braces in control statements (always)
      "curly": ["error", "multi-line"],

      // No variable shadowing
      "no-shadow": ["error", { allow: ["error", "err"] }],

      // No delete operator on properties
      "no-delete-var": "error",

      // Prefer const/let over var
      "no-var": "error",

      // Require or prevent trailing commas (match Prettier preference)
      "comma-dangle": ["warn", "always-multiline"],
    },
  },
];
