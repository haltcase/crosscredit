import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TitlePicker } from "../components/title-picker";
import { intersectCredits, parseTitleKey, titleKey } from "../lib/credits";
import type { Filter, Person, Role, Title, TitleRef } from "../lib/credits";
import { configurationOptions, creditsOptions, titleOptions } from "../lib/queries";

interface Search {
	left?: string;
	right?: string;
}
export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>): Search => ({
		...(parseTitleKey(search.left) ? { left: String(search.left) } : {}),
		...(parseTitleKey(search.right) ? { right: String(search.right) } : {})
	}),
	loader: ({ context }) =>
		context.queryClient.query({ ...configurationOptions, staleTime: "static" }),
	component: Home
});

const examples = [
	{
		label: "The White Lotus × The Last of Us",
		left: { type: "tv", id: 111_803 },
		right: { type: "tv", id: 100_088 }
	},
	{
		label: "The Office × Bridesmaids",
		left: { type: "tv", id: 2316 },
		right: { type: "movie", id: 55_721 }
	},
	{
		label: "Inception × The Dark Knight Rises",
		left: { type: "movie", id: 27_205 },
		right: { type: "movie", id: 49_026 }
	}
] satisfies { label: string; left: TitleRef; right: TitleRef }[];

function roleText(roles: Role[]) {
	return roles
		.map(
			(role) =>
				`${role.label}${role.episodes === null ? "" : ` (${role.episodes} ${role.episodes === 1 ? "episode" : "episodes"})`}`
		)
		.join(" · ");
}
function PersonRoles({ person, filter, title }: { person: Person; filter: Filter; title: string }) {
	return (
		<div className="person-roles">
			<span className="mobile-title">{title}</span>
			{filter !== "crew" && person.cast.length > 0 && <p>{roleText(person.cast)}</p>}
			{filter !== "cast" && person.crew.length > 0 && (
				<p className="crew-role">{roleText(person.crew)}</p>
			)}
		</div>
	);
}

function Home() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const client = useQueryClient();
	const configuration = useQuery(configurationOptions);
	const left = parseTitleKey(search.left);
	const right = parseTitleKey(search.right);
	const leftTitle = useQuery(titleOptions(left));
	const rightTitle = useQuery(titleOptions(right));
	const leftCredits = useQuery(creditsOptions(left));
	const rightCredits = useQuery(creditsOptions(right));
	const [filter, setFilter] = useState<Filter>("cast");
	const [copyState, setCopyState] = useState("Copy link");
	const hasSelection = left !== null || right !== null;
	const bothSelected = left !== null && right !== null;
	const loading = bothSelected && (leftCredits.isPending || rightCredits.isPending);
	const error = bothSelected ? (leftCredits.error ?? rightCredits.error) : null;
	const ready = bothSelected && leftCredits.isSuccess && rightCredits.isSuccess;
	const cast = intersectCredits(leftCredits.data ?? [], rightCredits.data ?? [], "cast");
	const crew = intersectCredits(leftCredits.data ?? [], rightCredits.data ?? [], "crew");
	const all = intersectCredits(leftCredits.data ?? [], rightCredits.data ?? [], "all");
	const matches = { cast, crew, all }[filter];

	function choose(side: "left" | "right", title: Title | null) {
		setCopyState("Copy link");
		void navigate({
			search: (previous) => {
				const next = { ...previous };
				if (title) next[side] = titleKey(title);
				else delete next[side];
				return next;
			}
		});
	}
	function example(pair: (typeof examples)[number]) {
		setCopyState("Copy link");
		void prefetchTitle(pair.left);
		void prefetchTitle(pair.right);
		void navigate({ search: { left: titleKey(pair.left), right: titleKey(pair.right) } });
	}
	async function prefetchTitle(ref: TitleRef) {
		try {
			await client.query(titleOptions(ref));
		} catch {
			// The title picker displays query failures and provides a retry action.
		}
	}
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(globalThis.location.href);
			setCopyState("Link copied!");
		} catch {
			setCopyState("Copy the URL above");
		}
	}

	return (
		<div className="app-shell">
			<header className="site-header">
				<a className="wordmark" href="/" aria-label="crosscredit home">
					<svg className="brand-icon" viewBox="0 0 48 48" aria-hidden="true">
						<defs>
							<mask id="ticket-overlap">
								<path fill="white" d="M0 0h48v48H0z" />
								<path fill="black" d="M24 16c8 4 8 12 0 16-8-4-8-12 0-16Z" />
							</mask>
						</defs>
						<g fill="currentColor" mask="url(#ticket-overlap)">
							<path d="M6 4h20a2 2 0 0 1 2 2v10a4 4 0 0 0 0 8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V24a4 4 0 0 0 0-8V6a2 2 0 0 1 2-2Z" />
							<path d="M22 12h20a2 2 0 0 1 2 2v10a4 4 0 0 0 0 8v10a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V32a4 4 0 0 0 0-8V14a2 2 0 0 1 2-2Z" />
						</g>
					</svg>
					crosscredit<span className="wordmark-dot">.</span>
				</a>
				<span className="header-note">FOR THE “WAIT, IS THAT…?” MOMENTS</span>
			</header>
			<main>
				<div
					className={`intro-collapse${hasSelection ? " is-collapsed" : ""}`}
					aria-hidden={hasSelection}>
					<div className="intro-clip">
						<section className="intro" aria-labelledby="headline">
							<h1 id="headline">
								Like six degrees...
								<br />
								<span>but it&apos;s only one</span>
							</h1>
							<p>Pick two movies or shows to see the people involved in both.</p>
						</section>
					</div>
				</div>

				{configuration.data?.configured === false && (
					<aside className="setup-note" role="status">
						<strong>One quick setup before the opening credits.</strong> Add your TMDB API Read
						Access Token to <code>.env</code> as <code>TMDB_READ_ACCESS_TOKEN</code>, then restart
						the dev server.{" "}
						<a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
							Get a free token ↗
						</a>
					</aside>
				)}

				<div className="comparison" aria-label="Choose two titles to compare">
					<TitlePicker side="left" selected={left} onSelect={(value) => choose("left", value)} />
					<span className="connection-symbol" aria-hidden="true">
						&
					</span>
					<TitlePicker side="right" selected={right} onSelect={(value) => choose("right", value)} />
				</div>

				{!bothSelected && (
					<div className="examples">
						<span>Try these to start</span>
						<div>
							{examples.map((pair) => (
								<button key={pair.label} type="button" onClick={() => example(pair)}>
									{pair.label}
									<span aria-hidden="true">↗</span>
								</button>
							))}
						</div>
					</div>
				)}
				{bothSelected && (
					<section className="results" aria-labelledby="results-heading" aria-busy={loading}>
						<div className="results-top">
							<div>
								<h2 id="results-heading">
									{ready
										? `${all.length} shared ${all.length === 1 ? "connection" : "connections"}.`
										: "Connecting the credits…"}
								</h2>
							</div>
							<button
								className="share-button"
								type="button"
								onClick={() => {
									void copyLink();
								}}>
								{copyState} <span aria-hidden="true">↗</span>
							</button>
						</div>
						{left && right && titleKey(left) === titleKey(right) && (
							<p className="inline-note">
								You’ve selected the same title twice. Choose a different second title to compare
								credits.
							</p>
						)}
						{error && (
							<div className="status-panel" role="alert">
								<h3>A brief intermission.</h3>
								<p>{error.message}</p>
								<button
									type="button"
									className="pill"
									onClick={() => {
										void leftCredits.refetch();
										void rightCredits.refetch();
									}}>
									Try again
								</button>
							</div>
						)}
						{!error && loading && (
							<div className="status-panel" role="status">
								<span className="loading-reel" aria-hidden="true">
									✳
								</span>
								<p>Checking every credited appearance, big and small…</p>
							</div>
						)}
						{!error && !loading && ready && (
							<>
								<div className="filters" role="group" aria-label="Filter shared people">
									{(
										[
											{ value: "cast", label: "Cast", count: cast.length },
											{ value: "crew", label: "Crew", count: crew.length },
											{ value: "all", label: "Everyone", count: all.length }
										] as const
									).map((tab) => (
										<button
											type="button"
											key={tab.value}
											aria-pressed={filter === tab.value}
											onClick={() => setFilter(tab.value)}>
											{tab.label} <span>{tab.count}</span>
										</button>
									))}
									<span className="filter-note">Yes, even the one-episode appearances.</span>
								</div>
								{matches.length === 0 ? (
									<div className="status-panel">
										<span className="empty-mark" aria-hidden="true">
											∅
										</span>
										<h3>
											{all.length > 0
												? "No shared people in this filter."
												: "No crossover in these credits."}
										</h3>
										<p>
											{all.length > 0
												? "Try Everyone for connections across different roles."
												: "An unexpected pair. Try swapping one title and follow the next connection."}
										</p>
									</div>
								) : (
									<div className="people-table">
										<div className="people-header">
											<span>THE FAMILIAR FACE</span>
											<span>{leftTitle.data?.name ?? "First title"}</span>
											<span>{rightTitle.data?.name ?? "Second title"}</span>
										</div>
										{matches.map(({ person, left: leftPerson, right: rightPerson }) => (
											<article className="person-row" key={person.id}>
												<a
													className="person-identity"
													href={`https://www.themoviedb.org/person/${person.id}`}
													target="_blank"
													rel="noreferrer">
													{person.photo ? (
														<img
															src={`https://image.tmdb.org/t/p/w185${person.photo}`}
															alt=""
															width={52}
															height={64}
															loading="lazy"
														/>
													) : (
														<span className="avatar-fallback" aria-hidden="true">
															{person.name
																.split(" ")
																.map((part) => part[0])
																.slice(0, 2)
																.join("")}
														</span>
													)}
													<strong>
														{person.name}
														<span aria-hidden="true"> ↗</span>
													</strong>
												</a>
												<PersonRoles
													person={leftPerson}
													filter={filter}
													title={leftTitle.data?.name ?? "First title"}
												/>
												<PersonRoles
													person={rightPerson}
													filter={filter}
													title={rightTitle.data?.name ?? "Second title"}
												/>
											</article>
										))}
									</div>
								)}
								<p className="results-footnote">
									Based on credits available on TMDB, across all listed TV episodes. Missing or
									uncredited cameos may not appear. “Everyone” also includes people with different
									jobs in each title.
								</p>
							</>
						)}
					</section>
				)}
			</main>
			<footer id="about">
				<div className="attribution">
					<a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
						<img src="/tmdb.svg" alt="TMDB" width={74} height={10} />
					</a>
					<p>
						This project uses the TMDB API but is not endorsed or certified by TMDB. Credit data and
						images belong to their respective owners.
					</p>
				</div>
			</footer>
		</div>
	);
}
