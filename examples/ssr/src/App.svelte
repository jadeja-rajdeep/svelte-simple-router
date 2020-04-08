<script>
	import { Router } from 'svelte-simple-router';
	import { routes } from './routes.js';

	// Used for SSR. A falsy value is ignored by the Router.
	export let url = "";
</script>

<Router routes={routes} url="{url}" />