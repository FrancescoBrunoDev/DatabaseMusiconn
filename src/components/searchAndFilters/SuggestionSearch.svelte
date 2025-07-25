<script lang="ts">
	import { slide } from 'svelte/transition';
	import { addFilterElement, entitiesForSearchBox } from '$databaseMusiconn/stores/storeFilters';
	import {
		getSuggestions,
		setInputValue,
		deleteSuggestions,
		getIsLoadingSuggestions
	} from '$databaseMusiconn/states/stateSearchSection.svelte';
	import { getIsSearchSectionInEventsList } from '$databaseMusiconn/states/stateSearchSection.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Loader2 } from 'lucide-svelte';

	let div: HTMLDivElement | undefined = $state(undefined);
	let isOpen: boolean = $state(false);
	let searchSection: HTMLDivElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);
	let suggestions: (AutocompleteResult & { count?: number })[] = $derived(getSuggestions());
	let isSearchSectionInEventsList = $derived(getIsSearchSectionInEventsList());
	let isLoadingSuggestions = $derived(getIsLoadingSuggestions());

	onMount(() => {
		if (browser) {
			searchSection = isSearchSectionInEventsList
				? (document.getElementById('searchSectionBottom') as HTMLDivElement)
				: (document.getElementById('mainSearchSection') as HTMLDivElement);

			searchInput = searchSection?.querySelector('input') ?? null;
		}
	});

	const handleFilterFromSuggestion = (suggestion: any) => {
		addFilterElement(suggestion);
		setInputValue({ value: '' });
		deleteSuggestions();
		isOpen = false;
	};

	$effect(() => {
		// open the search box when the input is focused
		if (searchInput) {
			searchInput.addEventListener('focus', () => {
				isOpen = true;
			});
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (searchSection && !searchSection.contains(event.target as Node)) {
				isOpen = false;
			}
		};

		window.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

{#if isOpen}
	<div
		bind:this={div}
		transition:slide
		class="bg-background dark:bg-dark-background z-10 mt-2 flex h-52 w-full flex-col gap-y-2 overflow-auto overscroll-auto rounded-xl border-2 p-2"
	>
		{#if isLoadingSuggestions}
			<!-- Show loading state while fetching and sorting suggestions -->
			<div class="text-secondary flex h-full items-center justify-center">
				<Loader2 class="h-6 w-6 animate-spin" />
				<p class="ml-2">Loading suggestions...</p>
			</div>
		{:else if suggestions && suggestions.length > 0}
			{#each suggestions as suggestion}
				<div class="flex h-fit items-center gap-1">
					{#if $entitiesForSearchBox.length > 1}
						<div class="border-text flex h-5 items-center rounded-full border-2 px-2 text-xs">
							{suggestion[1]}
						</div>
					{/if}

					<button
						class="w-full text-left"
						onclick={() => handleFilterFromSuggestion({ suggestion })}
						id={suggestion[2]}>{suggestion[0]}</button
					>
					{#if suggestion.count !== undefined && suggestion.count > 0}
						<span
							class="bg-primary dark:bg-dark-primary text-secondary flex h-5 items-center rounded-full px-2 text-xs"
						>
							{suggestion.count}
						</span>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="text-secondary flex h-full items-center justify-center">
				<p>No suggestions</p>
			</div>
		{/if}
	</div>
{/if}
