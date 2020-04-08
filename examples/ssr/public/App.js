'use strict';

function noop() { }
function is_promise(value) {
    return value && typeof value === 'object' && typeof value.then === 'function';
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
const missing_component = {
    $$render: () => ''
};
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const activeRoute = writable({});

let globalRouter;

function svelteRouteBuilder() {
	let pathName = window.location.pathname;
	let singleParams = [];
	singleParams = pathName.split("/");
	singleParams = singleParams.filter(Boolean);

	let pageName = "";
	if (singleParams[0]) pageName = singleParams[0];

	let namedParams = {};
	for (let x = 1; x < singleParams.length; x++) {
		namedParams[singleParams[x]] = singleParams[x + 1];
		x++;
	}

	//this code for creating parameter list using querystring/search parameters.
	let queryParams = {};
	let query = window.location.search;
	let queryParamsTemp = query.replace("?", "");
	queryParamsTemp = queryParamsTemp.split("&");
	queryParamsTemp = queryParamsTemp.filter(Boolean);
	for (let x = 0; x < queryParamsTemp.length; x++) {
		let temp = queryParamsTemp[x].split("=");
		queryParams[temp[0]] = temp[1];
	}

	return { pathName, pageName, singleParams, namedParams, queryParams };
}

function svelteRouteBuilderFromUrl(url) {
	let newUrl = new URL(url);

	let pathName = newUrl.pathname;
	let singleParams = [];
	singleParams = pathName.split("/");
	singleParams = singleParams.filter(Boolean);

	let pageName = "";
	if (singleParams[0]) pageName = singleParams[0];

	let namedParams = {};
	for (let x = 1; x < singleParams.length; x++) {
		namedParams[singleParams[x]] = singleParams[x + 1];
		x++;
	}

	//this code for creating parameter list using querystring/search parameters.
	let queryParams = {};
	let query = newUrl.search;
	let queryParamsTemp = query.replace("?", "");
	queryParamsTemp = queryParamsTemp.split("&");
	queryParamsTemp = queryParamsTemp.filter(Boolean);
	for (let x = 0; x < queryParamsTemp.length; x++) {
		let temp = queryParamsTemp[x].split("=");
		queryParams[temp[0]] = temp[1];
	}

	return { pathName, pageName, singleParams, namedParams, queryParams };
}

async function svelteRouteMatcher(router, url = "") {
	if (!globalRouter && router) {
		globalRouter = router;
	}
	if (!router) router = globalRouter;

	let routerData = {};

	if (url == "") {
		routerData = svelteRouteBuilder();
	} else {
		routerData = svelteRouteBuilderFromUrl(url);
	}


	let routePosition = -1;
	let requestedRoute;
	let redirectOnFail = '';
	let routePositionOnFail = -1;

	for (let x = 0; x < router.routes.length; x++) {
		for (let y = 0; y < router.routes[x].url.length; y++) {
			//let patt = new RegExp(router.routes[x].url[y]);
			let patt = router.routes[x].url[y];
			let patt_res1 = patt.test(routerData.pathName);
			let patt_res2 = patt.test(routerData.pageName);
			if (patt_res1 === true || patt_res2 === true) {
				if (typeof router.routes[x].searchFilter === "function") {
					if (router.routes[x].searchFilter(routerData, router.routes[x])) {
						//get route and pass into loader
						routePosition = x;
						break;
					}
				} else {
					//get route and pass into loader
					routePosition = x;
					break;
				}
			}
		}
	}


	if (routePosition >= 0) {
		if (router.routes[routePosition].hasOwnProperty('guard') && router.routes[routePosition].guard.hasOwnProperty('with') && typeof router.routes[routePosition].guard.with === "function") {
			if (!await router.routes[routePosition].guard.with(routerData, router.routes[routePosition])) {
				routePositionOnFail = routePosition;
				if (router.routes[routePosition].guard.hasOwnProperty('redirectOnFail')) {
					redirectOnFail = router.routes[routePosition].guard.redirectOnFail;
				}
				routePosition = -1;
			}
		}

		if (routePosition >= 0 && router.hasOwnProperty('groupGuard') && router.groupGuard.length > 0) {
			for (let x = 0; x < router.groupGuard.length; x++) {
				for (let y = 0; y < router.groupGuard[x].url.length; y++) {
					let patt = router.groupGuard[x].url[y];
					let patt_res1 = patt.test(routerData.pathName);
					let patt_res2 = patt.test(routerData.pageName);
					if (patt_res1 === true || patt_res2 === true) {
						if (typeof router.groupGuard[x].with === "function") {
							if (!await router.groupGuard[x].with(routerData, router.routes[x])) {
								routePositionOnFail = routePosition;
								if (router.groupGuard[x].hasOwnProperty('redirectOnFail')) {
									redirectOnFail = router.groupGuard[x].redirectOnFail;
								}
								routePosition = -1;
								break;
							}
						}
					}
				}
			}
		}
	}

	if (routePosition >= 0) {
		requestedRoute = router.routes[routePosition];
	} else if (routePosition < 0 && (typeof redirectOnFail === "string" && redirectOnFail !== "" && typeof redirectOnFail !== "undefined")) {
		if (sveletRouterCheckHost(redirectOnFail)) {
			history.pushState("", "", redirectOnFail);
			return await svelteRouteMatcher(router);
		} else {
			window.location = redirectOnFail;
		}

	} else if (typeof redirectOnFail === "function") {
		let tempurl = await redirectOnFail(routerData, router.routes[routePositionOnFail]);
		if (typeof tempurl === "string" && tempurl !== "" && typeof tempurl !== "undefined") {
			if (sveletRouterCheckHost(tempurl)) {
				history.pushState("", "", tempurl);
				return await svelteRouteMatcher(router);
			} else {
				window.location = tempurl;
			}
		}
	} else {
		requestedRoute = sveletRouterNameMatcher("404", router);
		routePosition = requestedRoute.position;
		requestedRoute = requestedRoute.route;
	}

	let activeRouteTemp = {
		routePosition,
		routeName: requestedRoute.name,
		...routerData,
		layout: { layout: requestedRoute.layout, viewed: false },
		component: { component: requestedRoute.component, viewed: false }
	};

	if (activeRouteTemp.layout.layout === "" || activeRouteTemp.layout.layout === "undefined" || typeof activeRouteTemp.layout.layout === "undefined") {
		activeRouteTemp.layout.layout = '';
		activeRouteTemp.layout.viewed = true;
	}

	if (activeRouteTemp.component.component === "" || activeRouteTemp.component.component === "undefined" || typeof activeRouteTemp.component.component === "undefined") {
		activeRouteTemp.component.component = '';
		activeRouteTemp.component.viewed = true;
	}

	activeRoute.set(activeRouteTemp);
	console.log(activeRouteTemp);
	return activeRouteTemp;
}

//find the route based on ID field.
function sveletRouterNameMatcher(name, router) {
	name = name.toString();
	let elementPos = router.routes.map(function (x) {
		return x.name;
	}).indexOf(name);
	if (elementPos >= 0) {
		return { position: elementPos, route: router.routes[elementPos] };
	}
}

function sveletRouterCheckHost(redirectUlr) {
	var currentHost = window.location.hostname;
	try {
		if (new URL(redirectUlr).hostname != currentHost) {
			return false;
		}
		return true;
	} catch (err) {
		return sveletRouterCheckHost(new URL(redirectUlr, window.location.href).href);
	}
	//this code is hack if above code is not working
	// var a = document.createElement('a');
	// a.href = redirectUlr;
	// if (a.hostname && a.hostname != window.location.hostname) {
	// 	return false;
	// }
	// return true;
}

if (typeof window !== 'undefined') {
	document.body.addEventListener('click', event => {
		if (event.target.pathname && event.target.hostname === window.location.hostname && (event.target.localName === 'a' || event.target.localName === 'A' || event.target.nodeName === 'a' || event.target.nodeName === 'A') && event.target.href !== "" && event.target.href !== 'undefined' && !event.target.classList.contains('no-follow')) {
			event.preventDefault();
			event.stopPropagation();
			history.pushState("", "", event.target.href);
			svelteRouteMatcher(globalRouter);
		} else if (event.target.localName === 'a' || event.target.localName === 'A' || event.target.nodeName === 'a' || event.target.nodeName === 'A') {
			window.location = event.target.href;
		}
	});

	window.onpopstate = function (event) {
		svelteRouteMatcher(globalRouter);
	};
}

/* src\router\component\route.svelte generated by Svelte v3.20.1 */

const Route = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { currentRoute = {} } = $$props;
	if ($$props.currentRoute === void 0 && $$bindings.currentRoute && currentRoute !== void 0) $$bindings.currentRoute(currentRoute);

	return `${currentRoute.layout.viewed == false
	? `${validate_component(currentRoute.layout.layout || missing_component, "svelte:component").$$render(
			$$result,
			{
				currentRoute: {
					...currentRoute,
					layout: {
						layout: currentRoute.layout.layout,
						viewed: true
					}
				}
			},
			{},
			{}
		)}`
	: `${currentRoute.component.viewed == false
		? `${validate_component(currentRoute.component.component || missing_component, "svelte:component").$$render(
				$$result,
				{
					currentRoute: {
						...currentRoute,
						component: {
							layout: currentRoute.component.component,
							viewed: true
						}
					}
				},
				{},
				{}
			)}`
		: ``}`}`;
});

/* src\router\component\router.svelte generated by Svelte v3.20.1 */

const Router = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { routes } = $$props;
	let { url = "" } = $$props;
	let { currentRoute = {} } = $$props;

	const unsubscribe = activeRoute.subscribe(value => {
		currentRoute = value;
	});

	currentRoute = svelteRouteMatcher(routes, url);
	if ($$props.routes === void 0 && $$bindings.routes && routes !== void 0) $$bindings.routes(routes);
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
	if ($$props.currentRoute === void 0 && $$bindings.currentRoute && currentRoute !== void 0) $$bindings.currentRoute(currentRoute);

	return `${(function (__value) {
		if (is_promise(__value)) return `
`;

		return (function (currentRoute) {
			return `
	${validate_component(Route, "Route").$$render($$result, { currentRoute }, {}, {})}
`;
		})(__value);
	})(currentRoute)}`;
});

/* src\views\layouts\admin.svelte generated by Svelte v3.20.1 */

const Admin = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { currentRoute = {} } = $$props;
	if ($$props.currentRoute === void 0 && $$bindings.currentRoute && currentRoute !== void 0) $$bindings.currentRoute(currentRoute);

	return `<div><h1>Admin Layout</h1>
	<a href="${"/dashboard"}">Dashboard</a>
	<a href="${"/members"}">Member List</a>
	<a href="${"/members/name/rajdeep"}">Rajdeep</a>
	<a href="${"/rajdeep"}">Wrong Link</a>
	<a href="${"/404"}">404</a>
	${validate_component(Route, "Route").$$render($$result, { currentRoute }, {}, {})}</div>`;
});

/* src\views\layouts\public.svelte generated by Svelte v3.20.1 */

const Public = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { currentRoute = {} } = $$props;
	if ($$props.currentRoute === void 0 && $$bindings.currentRoute && currentRoute !== void 0) $$bindings.currentRoute(currentRoute);

	return `<div><h1>Public Layout</h1>
	<a href="${"/dashboard"}">Dashboard</a>
	<a href="${"/members"}">Member List</a>
	<a href="${"/rajdeep"}">Wrong Link</a>
	<a href="${"/404"}">404</a>
	${validate_component(Route, "Route").$$render($$result, { currentRoute }, {}, {})}</div>`;
});

/* src\views\pages\dashboard.svelte generated by Svelte v3.20.1 */

const Dashboard = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	return `<h1>Dashboard</h1>`;
});

/* src\views\pages\membersList.svelte generated by Svelte v3.20.1 */

const MembersList = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	return `<h1>Member List</h1>`;
});

/* src\views\pages\404.svelte generated by Svelte v3.20.1 */

const _404 = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	return `<h1>404</h1>`;
});

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
			layout: Admin,
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
			layout: Admin,
			component: MembersList
		},
		{
			name: "404",
			url: [/^404$/],
			layout: Public,
			component: _404
		}
	]
};

/* src\App.svelte generated by Svelte v3.20.1 */

const App = create_ssr_component(($$result, $$props, $$bindings, $$slots) => {
	let { url = "" } = $$props;
	if ($$props.url === void 0 && $$bindings.url && url !== void 0) $$bindings.url(url);
	return `${validate_component(Router, "Router").$$render($$result, { routes, url }, {}, {})}`;
});

module.exports = App;
