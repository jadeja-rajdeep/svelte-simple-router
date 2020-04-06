<script>
	export let currentRoute = {};
</script>
{#if currentRoute.layout.viewed==false}
	<svelte:component this={currentRoute.layout.layout} currentRoute={{ ...currentRoute, layout:{layout:currentRoute.layout.layout,viewed:true}}}/>
{:else if currentRoute.component.viewed==false}
	<svelte:component this={currentRoute.component.component} currentRoute={{ ...currentRoute, component:{layout:currentRoute.component.component,viewed:true}}}/>
{/if}