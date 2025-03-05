<script lang="ts">
	import ActiveFilters from '$components/searchAndFilters/ActiveFilters.svelte';
	import SearchBox from '$components/searchAndFilters/SearchBox.svelte';
	import {
		getIsSearchSectionInEventsListOpen,
		getIsSearchSectionInEventsList
	} from '$states/stateSearchSection.svelte';
	import FiltersShareButton from '$components/searchAndFilters/FiltersShareButton.svelte';
	import { slide, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { cn } from '$lib/utils';

	let isSearchSectionInEventsList = $derived(getIsSearchSectionInEventsList());
	let isSearchSectionInEventsListOpen = $derived(getIsSearchSectionInEventsListOpen());
</script>

<div
	class="flex w-full flex-col {isSearchSectionInEventsListOpen || !isSearchSectionInEventsList
		? 'gap-y-4'
		: ''} "
>
	<div
		class={cn('', {
			'pb-2': !isSearchSectionInEventsListOpen,
			'order-2': !isSearchSectionInEventsList
		})}
	>
		<ActiveFilters />
	</div>
	{#if isSearchSectionInEventsListOpen}
		<div class="order-1" transition:slide={{ duration: 200, easing: cubicOut }}>
			<SearchBox />
		</div>
	{:else if !isSearchSectionInEventsList}
		<div
			class="order-1"
			in:fly={{ y: -10, opacity: 0, duration: 400, easing: cubicOut, delay: 600 }}
		>
			<SearchBox />
		</div>
	{/if}
	{#if !isSearchSectionInEventsList}
		<div class="order-3 place-self-end">
			<FiltersShareButton />
		</div>
	{/if}
</div>
