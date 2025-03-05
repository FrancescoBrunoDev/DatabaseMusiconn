<script lang="ts">
	import * as config from '$lib/config';
	import { goto } from '$app/navigation';

	// goto database
	goto('/database');
</script>

<svelte:head>
	<title>{config.title}</title>
</svelte:head>
