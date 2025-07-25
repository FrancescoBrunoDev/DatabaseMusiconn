<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import {
		autocomplete,
		setInputValue,
		deleteSuggestions
	} from '$databaseMusiconn/states/stateSearchSection.svelte';
	import MethodSearch from '$databaseMusiconn/components/searchAndFilters/MethodSearch.svelte';
	import SuggestionSearch from '$databaseMusiconn/components/searchAndFilters/SuggestionSearch.svelte';
	import {
		entitiesForSearchBox,
		updateEntitiesForSearchBox
	} from '$databaseMusiconn/stores/storeFilters';

	interface Props {
		entities?: Entity[];
		methodSearchVisible?: boolean;
	}

	// the entities shouold arrive as pprops, as fall back we use the default entities use $props
	let {
		entities = ['person', 'work', 'corporation', 'location'],
		methodSearchVisible = true
	}: Props = $props();

	let timeoutId: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	let _inputValue: string = $state('');

	$effect(() => {
		setInputValue({ value: _inputValue });
	});

	const handleInput = () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			if (_inputValue.length > 0) {
				autocomplete();
			} else {
				deleteSuggestions;
			}
		}, 300);
	};
</script>

<div class="flex items-center gap-2">
	<div
		class="bg-primary dark:bg-dark-primary text-background dark:text-dark-background focus:ring-secondary flex w-full items-center rounded-full px-4 drop-shadow-lg focus:ring-3 focus:outline-hidden"
	>
		{#if methodSearchVisible}
			<MethodSearch />
		{/if}
		<input
			class="focus-none placeholder:text-dark-text dark:placeholder:text-background h-10 w-full cursor-text bg-transparent px-3 outline-hidden"
			type="text"
			id="searchInput"
			bind:value={_inputValue}
			oninput={handleInput}
			placeholder={$LL.filters.search()}
			autocomplete="off"
		/>
	</div>
</div>
<div class="my-2 flex flex-wrap gap-2 pl-2">
	{#if entities.length > 0}
		{#each entities as entity}
			<button
				onclick={() => {
					updateEntitiesForSearchBox(entity);
					if (_inputValue.length > 0) {
						autocomplete();
					} else {
						deleteSuggestions;
					}
				}}
				class={'rounded-full border-2 px-4 pb-[0.15rem] text-sm transition-shadow hover:scale-103 hover:drop-shadow-lg ' +
					($entitiesForSearchBox.includes(entity)
						? 'border-primary bg-primary dark:bg-dark-primary text-background dark:text-dark-background'
						: 'bg-transparent')}
			>
				{$LL.filters.entities[entity]()}
			</button>
		{/each}
	{/if}
</div>
<SuggestionSearch />
