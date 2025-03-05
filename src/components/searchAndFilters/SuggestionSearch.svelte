<script lang="ts">
	import { slide } from 'svelte/transition';
	import { addFilterElement, entitiesForSearchBox } from '$stores/storeFilters';
	import {
		getSuggestions,
		setInputValue,
		deleteSuggestions
	} from '$states/stateSearchSection.svelte';
	import { urlBaseAPIMusiconn } from '$states/stateGeneral.svelte';
	import { projectID } from '$stores/storeEvents';
	import { Loader2 } from 'lucide-svelte';
	import { getIsSearchSectionInEventsList } from '$states/stateSearchSection.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let div: HTMLDivElement | undefined = $state(undefined);
	let isOpen: boolean = $state(false);
	let searchSection: HTMLDivElement | null = $state(null);
	let searchInput: HTMLInputElement | null = $state(null);
	let suggestions: AutocompleteResult[] = $derived(getSuggestions());
	let isSearchSectionInEventsList = $derived(getIsSearchSectionInEventsList());

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

	async function getNumbers(suggestionID: number, entity: string | undefined) {
		const res = await fetch(
			`${urlBaseAPIMusiconn}?action=query&${entity}=${suggestionID}&entity=none&format=json&project=${$projectID}`
		);
		if (res.ok) {
			const { count } = await res.json();
			return count.event;
		} else {
			console.error('Fetch failed', res.status, res.statusText);
		}
	}
</script>

{#if isOpen}
	<div
		bind:this={div}
		transition:slide
		class="bg-background dark:bg-dark-background z-10 mt-2 flex h-52 w-full flex-col gap-y-2 overflow-auto overscroll-auto rounded-xl border-2 p-2"
	>
		{#if suggestions && suggestions.length > 0}
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
					{#await getNumbers(Number(suggestion[2]), suggestion[1])}
						<span
							class="bg-primary dark:bg-dark-primary text-secondary flex h-5 items-center rounded-full px-2 text-xs"
						>
							<Loader2 class="h-full animate-spin py-1" />
						</span>
					{:then numberEvents}
						{#if Number(numberEvents) > 0}
							<span
								class="bg-primary dark:bg-dark-primary text-secondary flex h-5 items-center rounded-full px-2 text-xs"
							>
								{numberEvents}
							</span>
						{/if}
					{:catch error}
						<div>not availe now</div>
					{/await}
				</div>
			{/each}
		{:else}
			<div class="text-secondary flex h-full items-center justify-center">
				<p>No suggestions</p>
			</div>
		{/if}
	</div>
{/if}
