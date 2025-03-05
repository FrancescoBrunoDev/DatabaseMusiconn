<script lang="ts">
	import { filters } from '$stores/storeFilters';
	import FilterGroup from '$components/searchAndFilters/FilterGroup.svelte';
	import { fly, slide } from 'svelte/transition';

	const filterMethods: Method[] = ['or', 'and', 'not'];
	const filterColors = { or: 'primary', and: 'primary', not: 'destructive' };
</script>

{#if $filters.or.length > 0 || $filters.and.length > 0 || $filters.not.length > 0}
	<div
		class="flex flex-col gap-y-3"
		out:slide={{ duration: 600 }}
		in:fly={{ y: -10, duration: 400 }}
	>
		{#each filterMethods as method}
			<FilterGroup {method} color={filterColors[method]} />
		{/each}
	</div>
{/if}
