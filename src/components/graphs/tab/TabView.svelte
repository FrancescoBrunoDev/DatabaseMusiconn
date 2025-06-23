<script lang="ts">
	import { LL } from '$lib/i18n/i18n-svelte';
	import { getTitleString, getTitle } from '$databaseMusiconn/stores/storeEvents';
	import { fade } from 'svelte/transition';
	import { getColorForUidAndEntity } from '$databaseMusiconn/stores/storeFilters';

	interface Props {
		locationData: Array<{ id: string; count: number; color: string }>;
		workData: Array<{ id: string; count: number; color: string }>;
		composerData: Array<{ id: string; count: number; color: string }>;
		personData: Array<{ id: string; count: number; color: string }>;
		corporationData?: Array<{ id: string; count: number; color: string }>;
		width?: number;
		height?: number;
	}

	let {
		locationData = [],
		workData = [],
		composerData = [],
		personData = [],
		corporationData = [],
		width = $bindable(0),
		height = $bindable(0)
	}: Props = $props();

	// Get translated entity names
	function getEntityName(key: string): string {
		const entityKeys: Record<string, keyof typeof $LL.filters.entities> = {
			location: 'location',
			work: 'work',
			composer: 'composer',
			person: 'person',
			corporation: 'corporation'
		};

		const entityKey = entityKeys[key];
		return entityKey ? $LL.filters.entities[entityKey]() : key;
	}

	// Tab state
	let activeTab = $state('location');

	// Get the active data based on selected tab
	const activeData = $derived(() => {
		switch (activeTab) {
			case 'location':
				return locationData;
			case 'work':
				return workData;
			case 'composer':
				return composerData;
			case 'person':
				return personData;
			case 'corporation':
				return corporationData;
			default:
				return [];
		}
	});

	// Cache for entity names to avoid repeated lookups
	let entityNamesCache = $state<Record<string, Record<string, string>>>({
		location: {},
		work: {},
		composer: {},
		person: {},
		corporation: {}
	});

	// Single state object for loading states to reduce state updates
	let loadingStates = $state<Record<string, boolean>>({});
	let isLoading = $state(false);

	// Once when tab changes, load the titles
	$effect(() => {
		const currentTab = activeTab;
		const currentData = activeData();
		console.log(`Loading titles for tab: ${currentTab}`, currentData);
		loadTitlesForTab(currentTab, currentData);
	});

	// Load titles for the current tab
	async function loadTitlesForTab(entityType: string, data: any[]) {
		// Skip if no data
		if (!data.length) return;

		isLoading = true;

		try {
			// Create loading states for all items
			const newLoadingStates: Record<string, boolean> = {};
			for (const item of data) {
				newLoadingStates[item.id] = true;
			}
			loadingStates = newLoadingStates;

			// First step: Get all ids for this entity type
			const ids = data.map((item) => item.id);

			// Use getTitle to load all titles at once (this handles batching internally)
			await getTitle(ids, entityType as any);

			// Second step: Create a new cache object for this entity type
			const newCache = { ...entityNamesCache };
			if (!newCache[entityType]) {
				newCache[entityType] = {};
			}

			// Third step: Fetch each title and update the cache
			for (const item of data) {
				try {
					const name = await getTitleString(parseInt(item.id), entityType as any);
					newCache[entityType][item.id] = name || item.id;

					// Update colors for this item
					// updateItemColor(item, entityType);

					// Update loading state for this item
					loadingStates = {
						...loadingStates,
						[item.id]: false
					};
				} catch (error) {
					// Use ID as fallback if name retrieval fails
					newCache[entityType][item.id] = item.id;
					loadingStates = {
						...loadingStates,
						[item.id]: false
					};
				}
			}

			// Update the cache
			entityNamesCache = newCache;
		} finally {
			isLoading = false;
		}
	}

	// Update colors for an item based on entity type
	function updateItemColor(item: any, entityType: string) {
		if (['location', 'work', 'person', 'composer', 'corporation'].includes(entityType)) {
			const filterColor = getColorForUidAndEntity(parseInt(item.id), entityType as Entity);
			if (filterColor) {
				item.color = filterColor;
			}
		}
	}

	// Helper to get the entity name safely
	function getEntityTitle(id: string): string {
		return entityNamesCache[activeTab]?.[id] || `ID: ${id}`;
	}
</script>

<div
	class="flex h-full w-full flex-col overflow-hidden bg-border rounded-lg"
	style="width: {width}px; height: {height}px;"
>
	<!-- Tabs navigation -->
	<div class="flex flex-col gap-2 items-center">
		<div class="flex gap-2 rounded-b-none rounded-lg p-1 mx-auto w-full justify-center">
			{#each ['person', 'work', 'corporation', 'composer', 'location'] as tab}
				<button
					class="text-text dark:text-dark-text px-4 py-1 transition-all rounded-xl"
					class:bg-background={activeTab === tab}
					onclick={() => (activeTab = tab)}
				>
					{getEntityName(tab)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Tab content (memoized for performance) -->
	<div class="flex-1 overflow-y-auto bg-background rounded-xl">
		{#if isLoading}
			<div
				class="flex items-center h-full w-full gap-2 justify-center text-xs text-secondary dark:text-dark-secondary"
				in:fade={{ duration: 200 }}
			>
				<span class="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
				<span>Loading titles...</span>
			</div>
		{:else}
			<table
				class="w-full text-text dark:text-dark-text border-separate border-spacing-y-1 table-fixed p-4 px-6 pt-2"
			>
				<!-- Table content -->
				<tbody>
					{#if !activeData().length}
						<tr>
							<td colspan="2" class="py-8 text-center text-secondary">
								No data available for {getEntityName(activeTab)}
							</td>
						</tr>
					{:else}
						{#each activeData() as item, i (item.id)}
							<tr
								class="hover:bg-secondary/10 dark:hover:bg-dark-secondary/10 transition-colors"
								in:fade={{ duration: 200, delay: 50 * Math.min(5, i) }}
							>
								<td
									class="flex items-center gap-2 rounded-l-lg bg-background/80 dark:bg-dark-background/80 overflow-hidden w-full max-w-[calc(100%-80px)]"
								>
									<span
										class="inline-block flex-shrink-0 w-3 h-3 rounded-full"
										style="background-color: {getColorForUidAndEntity(
											parseInt(item.id),
											activeTab as Entity
										) || '#ccc'}"
										title="Color identifier"
									></span>
									<!-- Using keyed item to prevent unnecessary re-renders -->
									{#key item.id}
										{#if loadingStates[item.id]}
											<div class="flex items-center gap-2 min-w-0 flex-1">
												<span class="truncate opacity-60 overflow-hidden text-ellipsis"
													>Loading {item.id}...</span
												>
												<span
													class="flex-shrink-0 h-2 w-2 rounded-full bg-primary dark:bg-dark-primary animate-pulse"
												></span>
											</div>
										{:else}
											<span
												class=" overflow-hidden text-ellipsis min-w-0 flex-1"
												title={getEntityTitle(item.id)}>{getEntityTitle(item.id)}</span
											>
										{/if}
									{/key}
								</td>
								<td
									class="text-right font-medium rounded-r-lg bg-background/80 dark:bg-dark-background/80 w-[80px] flex-shrink-0"
								>
									{item.count}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		{/if}
		<!-- Fixed header to avoid re-rendering -->
	</div>
</div>
