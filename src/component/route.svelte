<script>
	export let currentRoute = {};

	//getting rest all props other than currentRoute to pass on
	let tempProps = $$props;
	export let restProps = new Array();
	for (const key in tempProps) {
		if (key !== "currentRoute") {
			restProps[key] = tempProps[key];
		}
	}
	//getting rest all props other than currentRoute to pass on
</script>
{#if currentRoute.layout.viewed == false}
	<svelte:component this={currentRoute.layout.layout} {...restProps} currentRoute={{ ...currentRoute, layout:{layout:currentRoute.layout.layout,viewed:true}}}/>
{:else if currentRoute.component.viewed == false}
	<svelte:component this={currentRoute.component.component} {...restProps} currentRoute={{ ...currentRoute, component:{layout:currentRoute.component.component,viewed:true}}}/>
{/if}