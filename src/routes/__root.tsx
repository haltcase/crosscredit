import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

import stylesheet from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
	head: () => ({
		meta: [
			{ charSet: "utf8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "crosscredit — Find the familiar faces" },
			{
				name: "description",
				content:
					"Two titles. A whole cast of connections. Find the actors and crew shared by your favorite movies and TV shows."
			}
		],
		links: [{ rel: "stylesheet", href: stylesheet }]
	}),
	component: () => (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Outlet />
				<Scripts />
			</body>
		</html>
	),
	notFoundComponent: () => (
		<main>
			<h1>This screening isn’t on the schedule.</h1>
			<a href="/">Back to crosscredit</a>
		</main>
	),
	errorComponent: ({ reset }) => (
		<main>
			<h1>Something interrupted the screening.</h1>
			<button type="button" onClick={reset}>
				Try again
			</button>
		</main>
	)
});
