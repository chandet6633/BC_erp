import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        ignores: [
            "dist/**",
            "vendor/**",
            "pb_public/**",
            "pb_migrations/**",
            "Menu/**",
            "HR dashboard/**",
            "Revenue dashboard/**",
            "bcauto/**",
            "shared/**",
            "test-results/**",
            "Docs/**",
            "scripts/**",
            "**/*.min.js",
            "**/pocketbase*.js"
        ]
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            "no-undef": "off",
            "no-unused-vars": "warn",
            "no-useless-assignment": "off"
        }
    }
];
