import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

// Private Vitest fixture; this module is never consumed through require().
// oxlint-disable-next-line node/no-top-level-await
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const variables = new Map(
	[...css.matchAll(/--(?<name>[\w-]+):\s*(?<color>#[\da-f]{6})\s*;/gi)].map((match) => [
		match.groups?.name,
		match.groups?.color
	])
);

function resolve(value: string): string {
	const variable = /^var\(--(?<name>[\w-]+)\)$/.exec(value)?.groups?.name;
	if (!variable) return value;
	const color = variables.get(variable);
	if (!color) throw new Error(`Missing color token: ${variable}`);
	return color;
}

function luminance(hex: string) {
	const channels = [1, 3, 5].map((offset) => {
		const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722;
}

function contrast(foreground: string, background: string) {
	const first = luminance(resolve(foreground));
	const second = luminance(resolve(background));
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const foregrounds = [
	...new Set(
		[...css.matchAll(/(?:^|[;\n])\s*color:\s*(?<color>#[\da-f]{6}|var\(--[\w-]+\))\s*;/gi)].map(
			(match) => match.groups?.color
		)
	)
].filter((color): color is string => color !== undefined && color !== "var(--paper)");
const surfaces = [
	...new Set(
		[
			...css.matchAll(/(?:^|[;\n])\s*background:\s*(?<color>#[\da-f]{6}|var\(--[\w-]+\))\s*;/gi)
		].map((match) => match.groups?.color)
	)
].filter(
	(color): color is string =>
		color !== undefined && color !== "var(--ink)" && color !== "var(--accent)"
);

describe("wCAG AA text contrast", () => {
	// Use the normal-text threshold even for large headings. Cover every light
	// surface, including hover states, cards, fallback avatars, and status panels.
	for (const foreground of foregrounds) {
		for (const background of surfaces) {
			it(`${foreground} on ${background} is at least 4.5:1`, () => {
				expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
			});
		}
	}

	it("keeps selected filter text readable on the dark background", () => {
		expect(contrast("var(--paper)", "var(--ink)")).toBeGreaterThanOrEqual(4.5);
		expect(css).not.toMatch(/opacity:\s*0\.6\s*;/);
	});
});
