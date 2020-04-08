import { activeRoute } from './store.js';

export let globalRouter;

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
					let checkSearchFilter = false;

					if (router.routes[x].searchFilter.constructor.name === "AsyncFunction") {
						if (await router.routes[x].searchFilter(routerData, router.routes[x])) checkSearchFilter = true;
					} else {
						if (router.routes[x].searchFilter(routerData, router.routes[x])) checkSearchFilter = true;
					}

					if (checkSearchFilter === true) {
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
			let checkGuardWith = false;
			if (router.routes[routePosition].guard.with === "AsyncFunction") {
				if (await router.routes[routePosition].guard.with(routerData, router.routes[routePosition])) checkGuardWith = true;
			} else {
				if (router.routes[routePosition].guard.with(routerData, router.routes[routePosition])) checkGuardWith = true;
			}

			if (checkGuardWith === false) {
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
							let checkGroupGuardWith = false;

							if (router.groupGuard[x].with === "AsyncFunction") {
								if (await router.groupGuard[x].with(routerData, router.routes[x])) checkGroupGuardWith = true;
							} else {
								if (router.groupGuard[x].with(routerData, router.routes[x])) checkGroupGuardWith = true;
							}

							if (checkGroupGuardWith === false) {
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
		let tempurl;
		if (router.groupGuard[x].with === "AsyncFunction") {
			tempurl = await redirectOnFail(routerData, router.routes[routePositionOnFail]);
		} else {
			tempurl = redirectOnFail(routerData, router.routes[routePositionOnFail]);
		}
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

function svelteRouterRedirect(redirectUlr) {
	if (sveletRouterCheckHost(redirectUlr)) {
		history.pushState("", "", redirectUlr);
		svelteRouteMatcher(globalRouter);
	} else {
		window.location = redirectUlr;
	}
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

export { svelteRouteMatcher, svelteRouterRedirect }