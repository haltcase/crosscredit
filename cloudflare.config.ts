import { bindings, defineConfig, triggers } from "cf/config";

export default defineConfig({
	worker: {
		name: "crosscredit",
		entrypoint: "@tanstack/react-start/server-entry",
		compatibilityDate: "2026-10-23",
		compatibilityFlags: ["nodejs_compat"],
		workersDev: true,
		domains: ["crosscredit.haltcase.dev"],
		// This route takes precedence over the zone-wide report-visit Worker.
		triggers: [triggers.fetch({ pattern: "crosscredit.haltcase.dev/*", zone: "haltcase.dev" })],
		env: {
			TMDB_READ_ACCESS_TOKEN: bindings.secret()
		}
	}
});
