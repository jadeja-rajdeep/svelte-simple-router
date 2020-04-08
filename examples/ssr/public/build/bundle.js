
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j];
                    if (attributes[attribute.name]) {
                        j++;
                    }
                    else {
                        node.removeAttribute(attribute.name);
                    }
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
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

    // (6:49) 
    function create_if_block_1(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*currentRoute*/ ctx[0].component.component;

    	function switch_props(ctx) {
    		return {
    			props: {
    				currentRoute: {
    					.../*currentRoute*/ ctx[0],
    					component: {
    						layout: /*currentRoute*/ ctx[0].component.component,
    						viewed: true
    					}
    				}
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*currentRoute*/ 1) switch_instance_changes.currentRoute = {
    				.../*currentRoute*/ ctx[0],
    				component: {
    					layout: /*currentRoute*/ ctx[0].component.component,
    					viewed: true
    				}
    			};

    			if (switch_value !== (switch_value = /*currentRoute*/ ctx[0].component.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(6:49) ",
    		ctx
    	});

    	return block;
    }

    // (4:0) {#if currentRoute.layout.viewed == false}
    function create_if_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*currentRoute*/ ctx[0].layout.layout;

    	function switch_props(ctx) {
    		return {
    			props: {
    				currentRoute: {
    					.../*currentRoute*/ ctx[0],
    					layout: {
    						layout: /*currentRoute*/ ctx[0].layout.layout,
    						viewed: true
    					}
    				}
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};

    			if (dirty & /*currentRoute*/ 1) switch_instance_changes.currentRoute = {
    				.../*currentRoute*/ ctx[0],
    				layout: {
    					layout: /*currentRoute*/ ctx[0].layout.layout,
    					viewed: true
    				}
    			};

    			if (switch_value !== (switch_value = /*currentRoute*/ ctx[0].layout.layout)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(4:0) {#if currentRoute.layout.viewed == false}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentRoute*/ ctx[0].layout.viewed == false) return 0;
    		if (/*currentRoute*/ ctx[0].component.viewed == false) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { currentRoute = {} } = $$props;
    	const writable_props = ["currentRoute"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Route> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Route", $$slots, []);

    	$$self.$set = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({ currentRoute });

    	$$self.$inject_state = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get currentRoute() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\router\component\router.svelte generated by Svelte v3.20.1 */

    // (16:0) {:catch error}
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		l: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(16:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (14:0) {:then currentRoute}
    function create_then_block(ctx) {
    	let current;

    	const route = new Route({
    			props: { currentRoute: /*currentRoute*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(route.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route_changes = {};
    			if (dirty & /*currentRoute*/ 1) route_changes.currentRoute = /*currentRoute*/ ctx[0];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(14:0) {:then currentRoute}",
    		ctx
    	});

    	return block;
    }

    // (13:21)   {:then currentRoute}
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		l: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(13:21)   {:then currentRoute}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let await_block_anchor;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 0,
    		error: 4,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*currentRoute*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			await_block_anchor = empty();
    			info.block.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*currentRoute*/ 1 && promise !== (promise = /*currentRoute*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[0] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { routes } = $$props;
    	let { url = "" } = $$props;
    	let { currentRoute = {} } = $$props;

    	const unsubscribe = activeRoute.subscribe(value => {
    		$$invalidate(0, currentRoute = value);
    	});

    	currentRoute = svelteRouteMatcher(routes, url);
    	const writable_props = ["routes", "url", "currentRoute"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, []);

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(1, routes = $$props.routes);
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({
    		activeRoute,
    		svelteRouteMatcher,
    		Route,
    		routes,
    		url,
    		currentRoute,
    		unsubscribe
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(1, routes = $$props.routes);
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute, routes, url];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { routes: 1, url: 2, currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*routes*/ ctx[1] === undefined && !("routes" in props)) {
    			console.warn("<Router> was created without expected prop 'routes'");
    		}
    	}

    	get routes() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentRoute() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\views\layouts\admin.svelte generated by Svelte v3.20.1 */
    const file = "src\\views\\layouts\\admin.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let a0;
    	let t2;
    	let t3;
    	let a1;
    	let t4;
    	let t5;
    	let a2;
    	let t6;
    	let t7;
    	let a3;
    	let t8;
    	let t9;
    	let a4;
    	let t10;
    	let t11;
    	let current;

    	const route = new Route({
    			props: { currentRoute: /*currentRoute*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Admin Layout");
    			t1 = space();
    			a0 = element("a");
    			t2 = text("Dashboard");
    			t3 = space();
    			a1 = element("a");
    			t4 = text("Member List");
    			t5 = space();
    			a2 = element("a");
    			t6 = text("Rajdeep");
    			t7 = space();
    			a3 = element("a");
    			t8 = text("Wrong Link");
    			t9 = space();
    			a4 = element("a");
    			t10 = text("404");
    			t11 = space();
    			create_component(route.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			h1 = claim_element(div_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Admin Layout");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(div_nodes);
    			a0 = claim_element(div_nodes, "A", { href: true });
    			var a0_nodes = children(a0);
    			t2 = claim_text(a0_nodes, "Dashboard");
    			a0_nodes.forEach(detach_dev);
    			t3 = claim_space(div_nodes);
    			a1 = claim_element(div_nodes, "A", { href: true });
    			var a1_nodes = children(a1);
    			t4 = claim_text(a1_nodes, "Member List");
    			a1_nodes.forEach(detach_dev);
    			t5 = claim_space(div_nodes);
    			a2 = claim_element(div_nodes, "A", { href: true });
    			var a2_nodes = children(a2);
    			t6 = claim_text(a2_nodes, "Rajdeep");
    			a2_nodes.forEach(detach_dev);
    			t7 = claim_space(div_nodes);
    			a3 = claim_element(div_nodes, "A", { href: true });
    			var a3_nodes = children(a3);
    			t8 = claim_text(a3_nodes, "Wrong Link");
    			a3_nodes.forEach(detach_dev);
    			t9 = claim_space(div_nodes);
    			a4 = claim_element(div_nodes, "A", { href: true });
    			var a4_nodes = children(a4);
    			t10 = claim_text(a4_nodes, "404");
    			a4_nodes.forEach(detach_dev);
    			t11 = claim_space(div_nodes);
    			claim_component(route.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file, 5, 1, 102);
    			attr_dev(a0, "href", "/dashboard");
    			add_location(a0, file, 6, 1, 126);
    			attr_dev(a1, "href", "/members");
    			add_location(a1, file, 7, 1, 163);
    			attr_dev(a2, "href", "/members/name/rajdeep");
    			add_location(a2, file, 8, 1, 200);
    			attr_dev(a3, "href", "/rajdeep");
    			add_location(a3, file, 9, 1, 246);
    			attr_dev(a4, "href", "/404");
    			add_location(a4, file, 10, 1, 282);
    			add_location(div, file, 4, 0, 94);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(div, t1);
    			append_dev(div, a0);
    			append_dev(a0, t2);
    			append_dev(div, t3);
    			append_dev(div, a1);
    			append_dev(a1, t4);
    			append_dev(div, t5);
    			append_dev(div, a2);
    			append_dev(a2, t6);
    			append_dev(div, t7);
    			append_dev(div, a3);
    			append_dev(a3, t8);
    			append_dev(div, t9);
    			append_dev(div, a4);
    			append_dev(a4, t10);
    			append_dev(div, t11);
    			mount_component(route, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const route_changes = {};
    			if (dirty & /*currentRoute*/ 1) route_changes.currentRoute = /*currentRoute*/ ctx[0];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(route);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { currentRoute = {} } = $$props;
    	const writable_props = ["currentRoute"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Admin> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Admin", $$slots, []);

    	$$self.$set = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({ Route, currentRoute });

    	$$self.$inject_state = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute];
    }

    class Admin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Admin",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get currentRoute() {
    		throw new Error("<Admin>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<Admin>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\views\layouts\public.svelte generated by Svelte v3.20.1 */
    const file$1 = "src\\views\\layouts\\public.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let a0;
    	let t2;
    	let t3;
    	let a1;
    	let t4;
    	let t5;
    	let a2;
    	let t6;
    	let t7;
    	let a3;
    	let t8;
    	let t9;
    	let current;

    	const route = new Route({
    			props: { currentRoute: /*currentRoute*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Public Layout");
    			t1 = space();
    			a0 = element("a");
    			t2 = text("Dashboard");
    			t3 = space();
    			a1 = element("a");
    			t4 = text("Member List");
    			t5 = space();
    			a2 = element("a");
    			t6 = text("Wrong Link");
    			t7 = space();
    			a3 = element("a");
    			t8 = text("404");
    			t9 = space();
    			create_component(route.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			h1 = claim_element(div_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t0 = claim_text(h1_nodes, "Public Layout");
    			h1_nodes.forEach(detach_dev);
    			t1 = claim_space(div_nodes);
    			a0 = claim_element(div_nodes, "A", { href: true });
    			var a0_nodes = children(a0);
    			t2 = claim_text(a0_nodes, "Dashboard");
    			a0_nodes.forEach(detach_dev);
    			t3 = claim_space(div_nodes);
    			a1 = claim_element(div_nodes, "A", { href: true });
    			var a1_nodes = children(a1);
    			t4 = claim_text(a1_nodes, "Member List");
    			a1_nodes.forEach(detach_dev);
    			t5 = claim_space(div_nodes);
    			a2 = claim_element(div_nodes, "A", { href: true });
    			var a2_nodes = children(a2);
    			t6 = claim_text(a2_nodes, "Wrong Link");
    			a2_nodes.forEach(detach_dev);
    			t7 = claim_space(div_nodes);
    			a3 = claim_element(div_nodes, "A", { href: true });
    			var a3_nodes = children(a3);
    			t8 = claim_text(a3_nodes, "404");
    			a3_nodes.forEach(detach_dev);
    			t9 = claim_space(div_nodes);
    			claim_component(route.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$1, 5, 1, 102);
    			attr_dev(a0, "href", "/dashboard");
    			add_location(a0, file$1, 6, 1, 127);
    			attr_dev(a1, "href", "/members");
    			add_location(a1, file$1, 7, 1, 164);
    			attr_dev(a2, "href", "/rajdeep");
    			add_location(a2, file$1, 8, 1, 201);
    			attr_dev(a3, "href", "/404");
    			add_location(a3, file$1, 9, 1, 237);
    			add_location(div, file$1, 4, 0, 94);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(div, t1);
    			append_dev(div, a0);
    			append_dev(a0, t2);
    			append_dev(div, t3);
    			append_dev(div, a1);
    			append_dev(a1, t4);
    			append_dev(div, t5);
    			append_dev(div, a2);
    			append_dev(a2, t6);
    			append_dev(div, t7);
    			append_dev(div, a3);
    			append_dev(a3, t8);
    			append_dev(div, t9);
    			mount_component(route, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const route_changes = {};
    			if (dirty & /*currentRoute*/ 1) route_changes.currentRoute = /*currentRoute*/ ctx[0];
    			route.$set(route_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(route);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { currentRoute = {} } = $$props;
    	const writable_props = ["currentRoute"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Public> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Public", $$slots, []);

    	$$self.$set = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	$$self.$capture_state = () => ({ Route, currentRoute });

    	$$self.$inject_state = $$props => {
    		if ("currentRoute" in $$props) $$invalidate(0, currentRoute = $$props.currentRoute);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentRoute];
    }

    class Public extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { currentRoute: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Public",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get currentRoute() {
    		throw new Error("<Public>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentRoute(value) {
    		throw new Error("<Public>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\views\pages\dashboard.svelte generated by Svelte v3.20.1 */

    const file$2 = "src\\views\\pages\\dashboard.svelte";

    function create_fragment$4(ctx) {
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text("Dashboard");
    			this.h();
    		},
    		l: function claim(nodes) {
    			h1 = claim_element(nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t = claim_text(h1_nodes, "Dashboard");
    			h1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$2, 0, 0, 0);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dashboard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Dashboard", $$slots, []);
    	return [];
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dashboard",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\views\pages\membersList.svelte generated by Svelte v3.20.1 */

    const file$3 = "src\\views\\pages\\membersList.svelte";

    function create_fragment$5(ctx) {
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text("Member List");
    			this.h();
    		},
    		l: function claim(nodes) {
    			h1 = claim_element(nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t = claim_text(h1_nodes, "Member List");
    			h1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$3, 0, 0, 0);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MembersList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("MembersList", $$slots, []);
    	return [];
    }

    class MembersList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MembersList",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\views\pages\404.svelte generated by Svelte v3.20.1 */

    const file$4 = "src\\views\\pages\\404.svelte";

    function create_fragment$6(ctx) {
    	let h1;
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text("404");
    			this.h();
    		},
    		l: function claim(nodes) {
    			h1 = claim_element(nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t = claim_text(h1_nodes, "404");
    			h1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$4, 0, 0, 0);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<_404> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("_404", $$slots, []);
    	return [];
    }

    class _404 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "_404",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

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

    function create_fragment$7(ctx) {
    	let current;

    	const router = new Router({
    			props: { routes, url: /*url*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];
    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { url = "" } = $$props;
    	const writable_props = ["url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({ Router, routes, url });

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	hydrate: true
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
