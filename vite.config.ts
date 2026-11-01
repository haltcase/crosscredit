import { cloudflare } from "@cloudflare/vite-plugin";
import { createOxfmtConfig } from "@haltcase/style/oxfmt";
import { createOxlintConfig } from "@haltcase/style/oxlint";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const qualityIgnore = ["src/routeTree.gen.ts"];

export default defineConfig({
	plugins: [
		...(process.env.VITEST ? [] : cloudflare({ viteEnvironment: { name: "ssr" } })),
		tanstackStart(),
		react()
	],
	server: {
		port: 3000
	},
	fmt: createOxfmtConfig({
		ignorePatterns: qualityIgnore
	}),
	lint: createOxlintConfig({
		node: true,
		tanstackStart: true,
		ignorePatterns: qualityIgnore,
		overrides: [
			{
				files: ["**/*.{ts,tsx}"],
				rules: {
					"eslint/func-style": ["error", "declaration", { allowArrowFunctions: true }],
					"eslint/no-use-before-define": ["error", { functions: false }],
					"typescript/no-explicit-any": "error",
					"typescript/no-non-null-assertion": "error",
					"typescript/no-floating-promises": "error",
					// Custom combobox follows the ARIA listbox pattern rather than a native select.
					"jsx-a11y/prefer-tag-over-role": "off",
					"jsx-a11y/no-noninteractive-element-to-interactive-role": "off"
				}
			},
			{
				files: ["src/router.tsx", "src/lib/queries.ts", "src/components/title-picker.tsx"],
				rules: {
					// Preserve inferred router/query generics and JSX return types.
					"typescript/explicit-module-boundary-types": "off"
				}
			}
		]
	}),
	test: {
		include: ["src/**/*.test.ts"]
	}
});
