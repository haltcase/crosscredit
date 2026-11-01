import { queryOptions } from "@tanstack/react-query";

import { getConfiguration, getCredits, getTitle, searchTitles } from "./api";
import { titleKey } from "./credits";
import type { TitleRef } from "./credits";

function pause(ms: number, signal: AbortSignal) {
	// Timers have no promise API in the browser; adapt cancellation for Query.
	// oxlint-disable-next-line promise/avoid-new
	return new Promise<void>((resolve, reject) => {
		signal.throwIfAborted();
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", abort);
			resolve();
		}, ms);
		function abort() {
			clearTimeout(timer);
			reject(new DOMException("Aborted", "AbortError"));
		}
		signal.addEventListener("abort", abort, { once: true });
	});
}

export const configurationOptions = queryOptions({
	queryKey: ["configuration"],
	queryFn: () => getConfiguration(),
	staleTime: Infinity
});
export function searchOptions(query: string) {
	const normalized = query.trim().slice(0, 120);
	return queryOptions({
		queryKey: ["search", normalized],
		queryFn: async ({ signal }) => {
			// Debounce inside Query: changing the key aborts the previous wait/request.
			await pause(250, signal);
			return searchTitles({ data: { query: normalized }, signal });
		},
		enabled: normalized.length >= 2,
		staleTime: 5 * 60_000,
		retry: false
	});
}
export function titleOptions(ref: TitleRef | null) {
	return queryOptions({
		queryKey: ["title", ref ? titleKey(ref) : null],
		queryFn: ({ signal }) => {
			if (!ref) throw new Error("Choose a title first.");
			return getTitle({ data: ref, signal });
		},
		enabled: ref !== null,
		staleTime: 6 * 60 * 60_000
	});
}
export function creditsOptions(ref: TitleRef | null) {
	return queryOptions({
		queryKey: ["credits", ref ? titleKey(ref) : null],
		queryFn: ({ signal }) => {
			if (!ref) throw new Error("Choose a title first.");
			return getCredits({ data: ref, signal });
		},
		enabled: ref !== null,
		staleTime: 6 * 60 * 60_000
	});
}
