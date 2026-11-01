import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "crosscredit",
		entrypoint: "@tanstack/react-start/server-entry",
		compatibilityDate: "2026-10-23",
		compatibilityFlags: ["nodejs_compat"],
		workersDev: true,
		domains: ["crosscredit.haltcase.dev"],
		env: {
			TMDB_READ_ACCESS_TOKEN: bindings.secret()
		}
	}
});
