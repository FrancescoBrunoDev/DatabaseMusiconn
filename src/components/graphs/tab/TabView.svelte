<script lang="ts">
	import { LL } from '$databaseMusiconn/lib/i18n/i18n-svelte';
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
	class="bg-border flex h-full w-full flex-col overflow-hidden rounded-lg"
	style="width: {width}px; height: {height}px;"
>
	<!-- Tabs navigation -->

	<div class="flex w-full justify-center gap-2 overflow-scroll rounded-lg rounded-b-none p-1">
		{#each ['person', 'work', 'corporation', 'composer', 'location'] as tab}
			<button
				class="text-text rounded-xl px-4 py-1 transition-all"
				class:bg-background={activeTab === tab}
				onclick={() => (activeTab = tab)}
			>
				{getEntityName(tab)}
			</button>
		{/each}
	</div>

	<!-- Tab content (memoized for performance) -->
	<div class="bg-background flex-1 overflow-y-auto rounded-xl">
		{#if isLoading}
			<div
				class="text-secondary flex h-full w-full items-center justify-center gap-2 text-xs"
				in:fade={{ duration: 200 }}
			>
				<span class="bg-primary h-2 w-2 animate-pulse rounded-full"></span>
				<span>Loading titles...</span>
			</div>
		{:else}
			<table class="text-text w-full table-fixed border-separate border-spacing-y-1 p-4 px-6 pt-2">
				<!-- Table content -->
				<tbody>
					{#if !activeData().length}
						<tr>
							<td colspan="2" class="text-secondary py-8 text-center">
								No data available for {getEntityName(activeTab)}
							</td>
						</tr>
					{:else}
						{#each activeData() as item, i (item.id)}
							<tr
								class="hover:bg-secondary/10 transition-colors"
								in:fade={{ duration: 200, delay: 50 * Math.min(5, i) }}
							>
								<td
									class="bg-background/80 flex w-full items-center gap-2 overflow-hidden rounded-l-lg"
								>
									<span
										class="inline-block h-3 w-3 flex-shrink-0 rounded-full"
										style="background-color: {getColorForUidAndEntity(
											parseInt(item.id),
											activeTab as Entity
										) || '#ccc'}"
										title="Color identifier"
									></span>
									<!-- Using keyed item to prevent unnecessary re-renders -->
									{#key item.id}
										{#if loadingStates[item.id]}
											<div class="flex min-w-0 flex-1 items-center gap-2">
												<span class="truncate overflow-hidden text-ellipsis opacity-60"
													>Loading {item.id}...</span
												>
												<span
													class="bg-primary dark:bg-dark-primary h-2 w-2 flex-shrink-0 animate-pulse rounded-full"
												></span>
											</div>
										{:else}
											<span
												class=" min-w-0 flex-1 overflow-hidden text-ellipsis"
												title={getEntityTitle(item.id)}>{getEntityTitle(item.id)}</span
											>
										{/if}
									{/key}
								</td>
								<td
									class="bg-background/80 dark:bg-dark-background/80 w-[80px] flex-shrink-0 rounded-r-lg text-right font-medium"
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
