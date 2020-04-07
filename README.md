# svelte-simple-router

## Svelte 3 History Based Single Page Router

## Installtion

with npm

```bash
npm i svelte-simple-router
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

## Structure of routes object

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
		},
		{
			url: [/^dashboard/],
			with: async function (routerData, route) {
				return true;
			},
			redirectOnFail:"/login"
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
### 1) groupGuard

```javascript
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

]
```

Using group guard you can guard the multiple routes using matching starting path or any regular expression that you want to check.

Fields | Description
-------|------------
**groupGuard:** | array of object hold all your group routes for your application
**groupGuard:url:** | array of regular expression that you want to match for that particular group route
**groupGuard:with:** | a callback function for checking and guarding particular route. must return either **true** or **false**
**groupGuard:redirectOnFail:** | a function or string url for redirect if guard is fail. if it is a function then must return valid **url**

groupGuard always check and run after specific url guard is completed.

### 2) routes

```javascript
routes: [
	{
		name: "dashboard",
		url: [/^dashboard$/, /^\s*$/],
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
		component: Dashboard
	},
	{
		name: "404",
		url: [/^404$/],
		layout: PublicLayout,
		component: Page404
	}
]
```

Fields | Description
-------|------------
**routes:** | array of object hold all your routes for your application
**routes:name:** | you need to provide unique name for each of your routes.
**routes:url:** | array of regular expression that you want to match for that particular route
**routes:searchFilter:** | a callback function for extra custom matching function if you required other than regular expression
**routes:guard:** | if you want to guard that particular route for some conditional check.
**routes:guard:with:** | a callback function for checking and guarding particular route. must return either **true** or **false**
**routes:guard:redirectOnFail:** | a function or string url for redirect if guard is fail. if it is a function then must return valid **url**
**routes:layout:** | layout component that you want to load, if you dont provide then only component is loaded.
**routes:component:** | page component that you want to load under the layout or without layout.

#### Mandatory routes

```javascript
{
	name: "404",
	url: [/^404$/],
	layout: PublicLayout,
	component: Page404
}
```

**404** named route is required to display the component if no component or layout is found.

## currentRoute object

every layout and component passed **currentRoute** props to easily available some router related information.

for example if you visit this url

http://localhost:5000/members/name/rajdeep?quervar1=value1

```javascript
{
  "routePosition": 1,
  "routeName": "members",
  "pathName": "/members/name/rajdeep",
  "pageName": "members",
  "singleParams": [
    "members",
    "name",
    "rajdeep"
  ],
  "namedParams": {
    "name": "rajdeep"
  },
  "queryParams": {
    "quervar1": "value1"
  },
  "layout": {
    "viewed": false
  },
  "component": {
    "viewed": false
  }
}
````

## searchFilter, group:with, group:redirectOnFail, groupGuard:with, groupGuard:redirectOnFail

all above function in your routes object passed two parameter

### **1) routerData**

**routerData** contains

for example 

```javascript
"pathName": "/members/name/rajdeep",
"pageName": "members",
"singleParams": [
"members",
"name",
"rajdeep"
],
"namedParams": {
"name": "rajdeep"
},
"queryParams": {
"quervar1": "value1"
}
```


### **2) route**

**route** contains whole object of your route that you defined in **routes** object

for example

```javascript
{
	name: "dashboard",
	url: [/^dashboard$/, /^\s*$/],
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
	component: Dashboard
}
```

## ```<a href="">``` in router

By default router will capture all the ```<a href="">``` onclick event and based on the href it will match the route

if it's not same domain link then it will just do the regular redirect 

if it's same domain link then it will start the matching process and load the matched route

### ```<a href="" class="no-follow">```

if you dont want capture some of your ```<a>``` link in router by default.

then just add the **class="no-follow"** and those click event will not goes into matching.

## Manually / Code level redirect

```javascript
import {RouterRedirect} from 'svelte-simple-router';
```

will provide you redirect functionality at code level.

usage example

```javascript
RouterRedirect('/some-other-url');
RouterRedirect('https://someother.url');
```












