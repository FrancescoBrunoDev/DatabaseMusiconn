<script lang="ts">
	import { selectedGraphType } from '$databaseMusiconn/stores/storeGraph';
	import { LL } from '$lib/i18n/i18n-svelte';
	import Selector from '$databaseMusiconn/components/ui/Selector.svelte';

	// make the options with $LL.graphs it should be an array of objects with label and value
	let options = $derived(
		['line', 'pie', 'map'].map((option) => ({
			label: $LL.graphs[option as 'line' | 'map' | 'pie']?.() ?? option,
			value: option
		}))
	);

	options = [
		{ label: $LL.graphs.line(), value: 'line' },
		{ label: $LL.graphs.pie(), value: 'pie' },
		{ label: $LL.graphs.map(), value: 'map' }
	];
</script>

<Selector bind:options bind:active={$selectedGraphType} />
