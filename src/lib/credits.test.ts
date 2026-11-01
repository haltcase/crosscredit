import { describe, expect, it } from "vite-plus/test";

import { creditsSchema, intersectCredits, normalizeCredits, parseTitleKey } from "./credits";

function credits(data: unknown) {
	return normalizeCredits(creditsSchema.parse(data));
}

describe("credit matching", () => {
	it("matches one-episode guests to movie cameos", () => {
		const tv = credits({
			cast: [{ id: 1, name: "Guest", roles: [{ character: "Visitor", episode_count: 1 }] }],
			crew: []
		});
		const movie = credits({
			cast: [{ id: 1, name: "Guest", character: "Cameo (uncredited)" }],
			crew: []
		});
		const result = intersectCredits(tv, movie, "cast");
		expect(result).toHaveLength(1);
		expect(result[0]?.left.cast).toEqual([{ label: "Visitor", episodes: 1 }]);
		expect(result[0]?.right.cast[0]?.label).toBe("Cameo (uncredited)");
	});

	it("keeps every character and crew job in a single person row", () => {
		const people = credits({
			cast: [
				{
					id: 1,
					name: "Person",
					roles: [
						{ character: "A", episode_count: 1 },
						{ character: "B", episode_count: 3 }
					]
				}
			],
			crew: [
				{ id: 1, name: "Person", jobs: [{ job: "Director", episode_count: 2 }] },
				{ id: 1, name: "Person", job: "Writer" }
			]
		});
		expect(people).toHaveLength(1);
		expect(people[0]?.cast).toHaveLength(2);
		expect(people[0]?.crew.map((role) => role.label)).toEqual(["Director", "Writer"]);
	});

	it("uses IDs rather than names and finds different-job connections under Everyone", () => {
		const left = credits({ cast: [{ id: 1, name: "Same Name", character: "Actor" }], crew: [] });
		const right = credits({
			cast: [{ id: 2, name: "Same Name", character: "Actor" }],
			crew: [{ id: 1, name: "Same Name", job: "Director" }]
		});
		expect(intersectCredits(left, right, "cast")).toEqual([]);
		expect(intersectCredits(left, right, "crew")).toEqual([]);
		expect(intersectCredits(left, right, "all").map((match) => match.person.id)).toEqual([1]);
	});

	it("deduplicates repeated jobs and does not double-count episodes", () => {
		const people = credits({
			cast: [],
			crew: [
				{ id: 1, name: "Director", jobs: [{ job: "Director", episode_count: 5 }] },
				{ id: 1, name: "Director", jobs: [{ job: "Director", episode_count: 5 }] }
			]
		});
		expect(people[0]?.crew).toEqual([{ label: "Director", episodes: 5 }]);
	});

	it("handles empty credits", () => {
		expect(intersectCredits([], [], "all")).toEqual([]);
	});
});

describe("shareable title references", () => {
	it("accepts movies and series", () => {
		expect(parseTitleKey("movie-27205")).toEqual({ type: "movie", id: 27_205 });
		expect(parseTitleKey("tv-2316")).toEqual({ type: "tv", id: 2316 });
	});

	it("rejects malformed and unsupported references", () => {
		for (const value of [
			undefined,
			null,
			[],
			"person-1",
			"tv-0",
			"tv--1",
			"movie-1junk",
			"tv-1.5",
			"movie-999999999999999999"
		]) {
			expect(parseTitleKey(value)).toBeNull();
		}
	});
});
