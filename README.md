# svelte-simple-router

## Svelte 3 History Based Single Page Router

## Installtion

with npm

```bash
npm i svelte-router-spa
```

## Usage Note

Ensure your local server is configured in SPA mode. In a default Svelte installation you need to edit your package.json and add _--single_ to `sirv public`.

```javascript
"start": "sirv public --single"
```

## Integration into your project

### Step 1 : Create Routes File

create routes.js file into your project directory

```javascript
import AdminLayout from './views/layouts/admin.svelte';
import PublicLayout from './views/layouts/public.svelte';
import Dashboard from './views/pages/dashboard.svelte';
import MembersList from './views/pages/membersList.svelte';
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
			component: Dashboard
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
			component: MembersList
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
```

### Step 2 : Import the routes.js and **Router** from svelte-simple-router into your main app component 

```javascript
<script>
	import { Router } from 'svelete-simple-router';
	import { routes } from './routes.js';
</script>

<Router routes={routes} />
```

### Step 3 : Create Layout File

for example : import AdminLayout from './views/layouts/admin.svelte';

we created admin.svelte file

```javascript
<script>
	import {Route} from 'svelete-simple-router';
	export let currentRoute = {};
</script>
<div>
	<h1>Admin Layout</h1>
	<a href="/dashboard">Dashboard</a>
	<a href="/members">Member List</a>
	<a href="/404">404</a>
	<Route {currentRoute} />
</div>
```


### Step 4 : Create Component/Page File

for example : import Dashboard from './views/pages/dashboard.svelte';

we created dashboard.svelte file

```javascript
<script>
	export let currentRoute = {};
</script>
<h1>Dashboard</h1>
```