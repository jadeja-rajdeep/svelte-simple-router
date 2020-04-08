<script>
	import { activeRoute } from './../store.js';
	import { svelteRouteMatcher } from './../router.js';
	import Route from './route.svelte';
	export let routes;
	export let url = "";
	export let currentRoute = {};
	currentRoute = svelteRouteMatcher(routes, url);
</script>
{#await currentRoute}
	<p>Loading...</p>
{:then currentRoute}
	<Route currentRoute={$activeRoute} />
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}