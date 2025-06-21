<script lang="ts">
	import { selectedGraphType } from '$databaseMusiconn/stores/storeGraph';
	import { LL } from '$lib/i18n/i18n-svelte';
	import Selector from '$databaseMusiconn/components/ui/Selector.svelte';

	// make the options with $LL.graphs it should be an array of objects with label and value
	let options = ['line', 'pie', 'map'].map((option) => ({
		label: $LL.graphs[option as 'line' | 'map' | 'pie']?.() ?? option,
		value: option
	}));
</script>

<Selector {options} bind:active={$selectedGraphType} />
