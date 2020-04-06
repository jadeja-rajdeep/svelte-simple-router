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

async function svelteRouteMatcher(router) {
	if (!globalRouter && router) {
		globalRouter = router;
	}
	if (!router) router = globalRouter;

	let routerData = svelteRouteBuilder();
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
				if (sveletRouterParameterMatcher(router.routes[x], routerData) === true && sveletRouterParameterConditionMatcher(router.routes[x], routerData) === true) {
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
	return activeRouteTemp;
}

//match the parameter based on search
function sveletRouterParameterMatcher(route, routerData) {
	if (route && route.search && route.search.length > 0) {
		let trueCounter = 0;
		for (let z = 0; z < route.search.length; z++) {
			let keyCounter = 0;
			let keyCounterState = 0;
			for (const key in route.search[z]) {
				if (route.search[z].hasOwnProperty(key)) {
					//let patt = new RegExp(route.search[z][key]);
					let patt = route.search[z][key];
					let patt_res1 = patt.test(routerData.queryParams[key]);
					let patt_res2 = patt.test(routerData.namedParams[key]);
					if (patt_res1 === true || patt_res2 === true) {
						keyCounterState++;
					}
					keyCounter++;
				}
			}
			if (keyCounterState >= keyCounter) {
				trueCounter++;
			}
		}
		if (trueCounter > 0) {
			return true;
		} else {
			return false;
		}
	} else {
		return true;
	}
}

//match the parameter based on condtion
function sveletRouterParameterConditionMatcher(route, routerData) {
	if (route && (route.groupSearchOperator == "||" || route.groupSearchOperator == "&&") && route.searchCondition && route.searchCondition.length > 0) {
		let masterCondtion = false;
		let groupCondtion = false;
		masterloop: for (let x = 0; x < route.searchCondition.length; x++) {
			let groupOperator = route.searchCondition[x].operator;
			if (groupOperator !== "||" && groupOperator !== "&&") {
				groupOperator == "||";
			}

			grouploop: for (let y = 0; y < route.searchCondition[x].group.length; y++) {
				let cond = route.searchCondition[x].group[y];
				let condStatus = false;
				if (cond[0] !== "search" && cond[0] !== "para" && cond[0] !== "var") cond[0] = "search";
				if (cond[0] != "" && cond[1] != "" && cond[2] != "" && cond[3] != "") {
					let search;
					let value;
					let vregx = /^\{{(.+)\}}$/;
					if (cond[0] == "var") {
						if (vregx.test(cond[1])) {
							search = eval(cond[1].replace(vregx, "$1"));
						} else {
							search = cond[1];
						}
					} else if (cond[0] == "para") {
						search = routerData.singleParams[cond[1]];
					} else if (cond[0] == "namedpara") {
						search = routerData.namedParams[cond[1]];
					} else {
						search = routerData.queryParams[cond[1]];
					}

					if (vregx.test(cond[3])) {
						value = eval(cond[3].replace(vregx, "$1"));
					} else {
						value = cond[3];
					}
					if (cond[2] === "==") {
						if (search == value) {
							condStatus = true;
						}
					} else if (cond[2] === "===") {
						if (search === value) {
							condStatus = true;
						}
					} else if (cond[2] === ">") {
						if (search > value) {
							condStatus = true;
						}
					} else if (cond[2] === "<") {
						if (search < value) {
							condStatus = true;
						}
					} else if (cond[2] === ">=") {
						if (search >= value) {
							condStatus = true;
						}
					} else if (cond[2] === "<=") {
						if (search <= value) {
							condStatus = true;
						}
					} else if (cond[2] === "!=") {
						if (search != value) {
							condStatus = true;
						}
					} else if (cond[2] === "!==") {
						if (search !== value) {
							condStatus = true;
						}
					}
				}

				if (groupOperator == "&&" && condStatus == false) {
					groupCondtion = false;
					break grouploop;
				} else if (groupOperator == "||" && condStatus == true) {
					groupCondtion = true;
					break grouploop;
				} else if (groupOperator == "||" && condStatus == false) {
					groupCondtion = false;
				} else {
					groupCondtion = true;
				}
			}

			if (route.groupSearchOperator == "&&" && groupCondtion == false) {
				masterCondtion = false;
				break;
			} else if (route.groupSearchOperator == "||" && groupCondtion == true) {
				masterCondtion = true;
				break;
			} else if (route.groupSearchOperator == "||" && groupCondtion == false) {
				masterCondtion = false;
			} else {
				masterCondtion = true;
			}
		}
		return masterCondtion;
	}
	return true;
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

/*
const router = {
	groupGuard: [
		{
			url: [/^members/],
			with: function (routerData, route) {
				return false;
			},
			redirectOnFail: function (routerData, route) {
				return 'https://google.com';
			}
		}

	],
	routes: [
		{
			name: "dashboard",
			url: [/^dashboard$/, /^\s*$/],
			guard: {
				with: function (routerData, route) {
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
			searchFilter: function (routerData, route) {
				return true;
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
*/
