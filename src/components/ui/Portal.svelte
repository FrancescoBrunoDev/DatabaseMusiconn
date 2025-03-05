<script lang="ts">
	import { onDestroy } from 'svelte';

	let { children } = $props();

	let ref: HTMLDivElement | null = $state(null);
	let portal: HTMLDivElement | null = $state(null);
	let shouldRemovePortal = $state(false);

	$effect(() => {
		const existingPortal = document.querySelector('.portal');

		if (existingPortal) {
			portal = existingPortal as HTMLDivElement;
			shouldRemovePortal = false;
		} else {
			portal = document.createElement('div');
			portal.className = 'portal';
			document.body.appendChild(portal);
			shouldRemovePortal = true;
		}

		// Sposta il contenuto nel portale
		if (ref && portal) {
			portal.appendChild(ref);
		}
	});

	onDestroy(() => {
		if (ref && portal && portal.contains(ref)) {
			portal.removeChild(ref);
		}

		if (shouldRemovePortal && portal && document.body.contains(portal)) {
			document.body.removeChild(portal);
		}
	});
</script>

<div bind:this={ref}>
	{@render children?.()}
</div>
