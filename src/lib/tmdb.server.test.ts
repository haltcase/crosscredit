import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv("TMDB_READ_ACCESS_TOKEN", "test-server-token");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("TMDB Worker cache", () => {
	it("reuses resolved data without another upstream request", async () => {
		const upstream = vi.fn().mockResolvedValue(Response.json({ id: 1, title: "Example" }));
		vi.stubGlobal("fetch", upstream);
		const { getTitle } = await import("./tmdb.server");
		const ref = { type: "movie", id: 1 } as const;

		const first = await getTitle(ref);
		expect(await getTitle(ref)).toEqual(first);
		expect(upstream).toHaveBeenCalledTimes(1);
		expect(upstream).toHaveBeenCalledWith(
			"https://api.themoviedb.org/3/movie/1?language=en-US",
			expect.objectContaining({
				headers: { Authorization: "Bearer test-server-token", Accept: "application/json" }
			})
		);
	});

	it("keeps concurrent cold requests independent instead of sharing request-bound promises", async () => {
		const upstream = vi
			.fn()
			.mockRejectedValueOnce(new Error("First request interrupted"))
			.mockResolvedValueOnce(Response.json({ id: 1, title: "Example" }));
		vi.stubGlobal("fetch", upstream);
		const { getTitle } = await import("./tmdb.server");
		const ref = { type: "movie", id: 1 } as const;

		const results = await Promise.allSettled([getTitle(ref), getTitle(ref)]);
		expect(results[0]?.status).toBe("rejected");
		expect(results[1]).toMatchObject({ status: "fulfilled", value: { id: 1, name: "Example" } });
		expect(upstream).toHaveBeenCalledTimes(2);
	});
});
