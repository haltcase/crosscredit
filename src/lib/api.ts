import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { titleRefSchema } from "./credits";

export const searchTitles = createServerFn({ method: "GET" })
	.validator(z.object({ query: z.string().trim().min(2).max(120) }))
	.handler(async ({ data }) => {
		const tmdb = await import("./tmdb.server");
		return tmdb.searchTitles(data.query);
	});
export const getTitle = createServerFn({ method: "GET" })
	.validator(titleRefSchema)
	.handler(async ({ data }) => {
		const tmdb = await import("./tmdb.server");
		return tmdb.getTitle(data);
	});
export const getCredits = createServerFn({ method: "GET" })
	.validator(titleRefSchema)
	.handler(async ({ data }) => {
		const tmdb = await import("./tmdb.server");
		return tmdb.getCredits(data);
	});
export const getConfiguration = createServerFn({ method: "GET" }).handler(async () => {
	const tmdb = await import("./tmdb.server");
	return { configured: tmdb.isConfigured() };
});
