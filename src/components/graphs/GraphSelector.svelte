<script lang="ts">
	import { selectedGraphType } from '$databaseMusiconn/stores/storeGraph';
	import Selector from '$databaseMusiconn/components/ui/Selector.svelte';

	// make the options with $LL.graphs it should be an array of objects with label and value
	let options = ['line', 'map', 'tab'];
</script>

<Selector {options} bind:active={$selectedGraphType} />
