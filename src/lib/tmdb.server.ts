import { z } from "zod";

import { creditsSchema, normalizeCredits } from "./credits";
import type { Person, Title, TitleRef } from "./credits";

// Bounded, per-isolate cache of resolved data. Worker eviction makes it cold again.
const cache = new Map<string, { expires: number; value: unknown }>();

async function request<T>(path: string, schema: z.ZodType<T>, ttl = 6 * 60 * 60_000): Promise<T> {
	const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
	if (!token) {
		throw new Error("Add TMDB_READ_ACCESS_TOKEN to .env and restart the server to connect TMDB.");
	}
	const cached = cache.get(path);
	if (cached && cached.expires > Date.now()) return schema.parse(cached.value);
	// Keep request-bound I/O out of the isolate-wide cache.
	const response = await fetch(`https://api.themoviedb.org/3${path}`, {
		headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
		signal: AbortSignal.timeout(12_000)
	}).catch(() => {
		throw new Error("TMDB could not be reached. Please try again in a moment.");
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error("TMDB rejected the server token. Check the server API Read Access Token.");
	}
	if (response.status === 429) {
		throw new Error("TMDB is busy. Please wait a few seconds and try again.");
	}
	if (response.status === 404) {
		throw new Error("That title is no longer available on TMDB. Try searching again.");
	}
	if (!response.ok) throw new Error("TMDB could not load this request. Please try again.");
	const parsed = schema.safeParse(await response.json());
	if (!parsed.success) {
		throw new Error("TMDB returned an unexpected response. Please try again later.");
	}
	if (cache.size >= 200) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(path, { expires: Date.now() + ttl, value: parsed.data });
	return parsed.data;
}

const rawTitleSchema = z.object({
	id: z.number().int().positive(),
	media_type: z.string().optional(),
	title: z.string().optional(),
	name: z.string().optional(),
	release_date: z.string().optional(),
	first_air_date: z.string().optional(),
	poster_path: z.string().nullable().default(null),
	overview: z.string().default("")
});

function toTitle(data: z.infer<typeof rawTitleSchema>, type: TitleRef["type"]): Title {
	return {
		id: data.id,
		type,
		name: data.title || data.name || "Untitled",
		year: (data.release_date || data.first_air_date || "").slice(0, 4),
		poster: data.poster_path,
		overview: data.overview
	};
}

export async function searchTitles(query: string): Promise<Title[]> {
	const data = await request(
		`/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`,
		z.object({ results: z.array(rawTitleSchema) }),
		5 * 60_000
	);
	return data.results
		.flatMap((item) =>
			item.media_type === "movie" || item.media_type === "tv"
				? [toTitle(item, item.media_type)]
				: []
		)
		.slice(0, 8);
}
export async function getTitle(ref: TitleRef): Promise<Title> {
	return toTitle(await request(`/${ref.type}/${ref.id}?language=en-US`, rawTitleSchema), ref.type);
}
export async function getCredits(ref: TitleRef): Promise<Person[]> {
	const endpoint = ref.type === "tv" ? "aggregate_credits" : "credits";
	return normalizeCredits(
		await request(`/${ref.type}/${ref.id}/${endpoint}?language=en-US`, creditsSchema)
	);
}
export function isConfigured(): boolean {
	return Boolean(process.env.TMDB_READ_ACCESS_TOKEN?.trim());
}
