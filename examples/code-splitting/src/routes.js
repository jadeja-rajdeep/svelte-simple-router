import AdminLayout from './views/layouts/Admin.svelte';
import PublicLayout from './views/layouts/Public.svelte';
import Page404 from './views/pages/404.svelte';

const routes = {
	groupGuard: [
		{
			url: [/^members/],
			with: async function (routerData, route) {
				return true;
			},
			redirectOnFail: function (routerData, route) {
				return '/dashboard';
			}
		}

	],
	routes: [
		{
			name: "dashboard",
			url: [/^dashboard$/, /^\s*$/],
			guard: {
				with: async function (routerData, route) {
					return true;
				},
				redirectOnFail: '/404'
			},
			layout: AdminLayout,
			component: async function () {
				let com = await import('./views/pages/Dashboard.svelte');
				return com.default;
			}
		},
		{
			name: "members",
			url: [/^members/],
			searchFilter: async function (routerData, route) {
				return true;
			},
			guard: {
				with: async function (routerData, route) {
					return true;
				},
				redirectOnFail: '/404'
			},
			layout: AdminLayout,
			component: async function () {
				let com = await import('./views/pages/MembersList.svelte');
				return com.default;
			}
		},
		{
			name: "404",
			url: [/^404$/],
			layout: PublicLayout,
			component: Page404
		}
	]
};

export { routes }