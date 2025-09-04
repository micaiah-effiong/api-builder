const tslint = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-config-prettier");

// eslint.config.js
module.exports = [
  {
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
      },
    },
    plugins: { tslint, prettier },
    ignores: ["dist/**"],
    files: ["src/**/*.ts"],
    rules: {
      "tslint/no-explicit-any": "off",
      "tslint/no-unused-vars": [
        "warn", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
