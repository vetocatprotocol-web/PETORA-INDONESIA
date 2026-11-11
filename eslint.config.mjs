import js from "@eslint/js"
import tseslint from "typescript-eslint"
import globals from "globals"

export default tseslint.config(
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cts,mts,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        process: "readonly",
        console: "readonly",
        React: "readonly",
        JSX: "readonly"
      }
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "error"
    },
    ignores: ["node_modules", "dist", ".next", "build", "drizzle"]
  },
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
)
