import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import type { Title, TitleRef } from "../lib/credits";
import { searchOptions, titleOptions } from "../lib/queries";

export function Poster({
	path,
	name,
	small = false
}: {
	path: string | null;
	name: string;
	small?: boolean;
}) {
	return path ? (
		<img
			className={small ? "poster small" : "poster"}
			src={`https://image.tmdb.org/t/p/w185${path}`}
			alt={`${name} poster`}
			width={92}
			height={138}
			loading="lazy"
		/>
	) : (
		<span className={small ? "poster placeholder small" : "poster placeholder"} aria-hidden="true">
			✳
		</span>
	);
}

export function TitlePicker({
	side,
	selected,
	onSelect
}: {
	side: "left" | "right";
	selected: TitleRef | null;
	onSelect: (value: Title | null) => void;
}) {
	const id = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const client = useQueryClient();
	const [text, setText] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const search = useQuery({
		...searchOptions(text),
		enabled: open && !selected && text.trim().length >= 2
	});
	const title = useQuery(titleOptions(selected));
	const results = search.data ?? [];
	const showList = open && !selected && text.trim().length >= 2;
	let feedback = `${results.length} titles found`;
	if (search.isPending) feedback = "Searching the credits…";
	else if (search.isError) feedback = search.error.message;
	else if (results.length === 0) feedback = "No titles found. Try another name.";

	function select(value: Title) {
		client.setQueryData(titleOptions(value).queryKey, value);
		onSelect(value);
		setOpen(false);
		setText("");
		setActive(-1);
	}

	return (
		<section
			className={`picker ${side}`}
			aria-label={`${side === "left" ? "First" : "Second"} title`}>
			<div className="picker-label">
				<span>{side === "left" ? "FIRST TITLE" : "SECOND TITLE"}</span>
			</div>
			{selected ? (
				<div className="selected-title">
					<Poster path={title.data?.poster ?? null} name={title.data?.name ?? "Loading"} />
					<div className="selected-details">
						<span className="eyebrow">
							{selected.type === "tv" ? "TV SERIES" : "MOVIE"}{" "}
							{title.data?.year && `· ${title.data.year}`}
						</span>
						<h2>
							{title.data?.name ?? (title.isError ? "Couldn’t load title" : "Loading title…")}
						</h2>
						{title.isError && (
							<button
								type="button"
								className="text-button"
								onClick={() => {
									void title.refetch();
								}}>
								Retry
							</button>
						)}
						<button
							type="button"
							className="text-button change"
							onClick={() => {
								onSelect(null);
								setOpen(true);
								requestAnimationFrame(() => inputRef.current?.focus());
							}}>
							Change title <span aria-hidden="true">↗</span>
						</button>
					</div>
				</div>
			) : (
				<div
					className="search-area"
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
					}}>
					<label className="search-box" htmlFor={id}>
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.7"
							aria-hidden="true">
							<circle cx="10.5" cy="10.5" r="6.5" />
							<path d="m16 16 5 5" />
						</svg>
						<input
							ref={inputRef}
							id={id}
							type="text"
							role="combobox"
							aria-label={`Search ${side === "left" ? "first" : "second"} movie or TV show`}
							aria-autocomplete="list"
							aria-expanded={showList}
							aria-controls={`${id}-results`}
							aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
							autoComplete="off"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							enterKeyHint="search"
							maxLength={120}
							value={text}
							placeholder="A movie or TV show…"
							onFocus={() => setOpen(true)}
							onChange={(event) => {
								setText(event.target.value);
								setOpen(true);
								setActive(-1);
							}}
							onKeyDown={(event) => {
								if (event.nativeEvent.isComposing) return;
								if (event.key === "Escape") {
									setOpen(false);
									setActive(-1);
								}
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setOpen(true);
									setActive((previous) => Math.min(previous + 1, results.length - 1));
								}
								if (event.key === "ArrowUp") {
									event.preventDefault();
									setActive((previous) => Math.max(previous - 1, 0));
								}
								if (event.key === "Enter" && showList) {
									const result = results[Math.max(active, 0)];
									if (result) {
										event.preventDefault();
										select(result);
									}
								}
							}}
						/>
						<kbd aria-hidden="true">↵</kbd>
					</label>
					{showList && (
						<div className="search-popover">
							<div className="search-feedback" role="status">
								{feedback}
							</div>
							{search.isError && (
								<button
									type="button"
									className="text-button"
									onClick={() => {
										void search.refetch();
									}}>
									Try again
								</button>
							)}
							<ul id={`${id}-results`} role="listbox" aria-label="Matching titles">
								{results.map((result, index) => (
									<li
										key={`${result.type}-${result.id}`}
										id={`${id}-option-${index}`}
										role="option"
										aria-selected={active === index}>
										<button
											type="button"
											className={`suggestion ${active === index ? "active" : ""}`}
											tabIndex={-1}
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => select(result)}>
											<Poster path={result.poster} name={result.name} small />
											<span>
												<strong>{result.name}</strong>
												<span className="suggestion-meta">
													{result.year || "Year unknown"} <span>·</span>{" "}
													{result.type === "tv" ? "TV series" : "Movie"}
												</span>
											</span>
											<span className="suggestion-arrow" aria-hidden="true">
												↗
											</span>
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
