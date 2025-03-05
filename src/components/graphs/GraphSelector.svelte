<script lang="ts">
	import { selectedGraphType } from '$stores/storeGraph';
	import { LL } from '$lib/i18n/i18n-svelte';
	import Selector from '$components/ui/Selector.svelte';

	// make the options with $LL.graphs it should be an array of objects with label and value
	let options = ['line', 'map'].map((option) => ({
		label: $LL.graphs[option as 'line' | 'map'](),
		value: option
	}));
</script>

<Selector {options} bind:active={$selectedGraphType} />
