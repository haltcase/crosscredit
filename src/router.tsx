import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
	// Each SSR request gets its own client; nothing is shared across visitors.
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				refetchOnMount: false
			}
		}
	});
	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	});
	setupRouterSsrQueryIntegration({ router, queryClient });
	return router;
}
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
