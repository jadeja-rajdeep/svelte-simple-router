<script>
	import { Route } from 'svelte-simple-router';
	export let currentRoute = {}
</script>
<div>
	<h1>Admin Layout</h1>
	<a href="/dashboard">Dashboard</a>
	<a href="/members">Member List</a>
	<a href="/members/name/rajdeep">Rajdeep</a>
	<a href="/rajdeep">Wrong Link</a>
	<a href="/404">404</a>
	<Route {currentRoute} />
</div>