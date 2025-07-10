<script lang="ts">
	import { LL } from '$lib/i18n/i18n-svelte';
	import {
		getTitleString,
		allTitles,
		getTitlesPrioritized
	} from '$databaseMusiconn/stores/storeEvents';
	import { get } from 'svelte/store';
	import { fly, fade } from 'svelte/transition';
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
	let activeTab = $state('person');

	// Pre-compute and cache the top items for each tab to avoid recalculation
	const topItemsCache = $derived(() => {
		const cache: Record<string, Array<{ id: string; count: number; color: string }>> = {};

		const tabs = ['location', 'work', 'composer', 'person', 'corporation'] as const;
		tabs.forEach((tab) => {
			let data: Array<{ id: string; count: number; color: string }>;

			switch (tab) {
				case 'location':
					data = locationData;
					break;
				case 'work':
					data = workData;
					break;
				case 'composer':
					data = composerData;
					break;
				case 'person':
					data = personData;
					break;
				case 'corporation':
					data = corporationData || [];
					break;
			}

			// Pre-sort and limit to top items only
			cache[tab] = data.sort((a, b) => b.count - a.count).slice(0, MAX_VISIBLE_ITEMS);
		});

		return cache;
	});

	// Get active data from pre-computed cache with titles
	const activeData = $derived(() => {
		// Force reactivity: re-run when cache for current tab updates
		// This ensures the component re-renders when titles are loaded in background
		$allTitles[activeTab as Entity]; // Reactive trigger (value not used)

		const topItems = topItemsCache()[activeTab] || [];

		// Enhance with titles and colors
		return topItems.map((item) => {
			const id = parseInt(item.id);
			const entity = activeTab as Entity;

			return {
				id: item.id,
				count: item.count,
				title: getTitleString(id, entity),
				color: getColorForUidAndEntity(id, entity) || item.color || '#ccc'
			};
		});
	});

	// Effect to trigger prioritized title fetching when tab changes
	$effect(() => {
		const currentTab = activeTab;
		const topItems = topItemsCache()[currentTab] || [];

		// Only fetch if we have items and they're not all cached
		if (topItems.length > 0) {
			// Check which items need titles
			const currentTitles = get(allTitles)[currentTab as Entity] || {};
			const uncachedItems = topItems.filter((item) => !currentTitles[parseInt(item.id)]?.title);

			if (uncachedItems.length > 0) {
				getTitlesPrioritized(uncachedItems, currentTab as Entity).catch((error) => {
					console.error(`Failed to fetch prioritized titles for ${currentTab}:`, error);
				});
			}
		}
	});

	// Performance optimization: limit rendered items for very large datasets
	let MAX_VISIBLE_ITEMS = 100;
	const displayData = $derived(() => activeData());
</script>

<div
	class="bg-border flex h-full w-full flex-col overflow-hidden rounded-lg"
	style="width: {width}px; height: {height}px;"
>
	<!-- Tabs navigation -->

	<div class="flex w-full gap-2 overflow-scroll rounded-lg rounded-b-none p-1 md:justify-center">
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

	<!-- Tab content -->
	<div class="bg-background flex-1 overflow-y-auto rounded-xl">
		<table class="text-text w-full table-fixed border-separate border-spacing-y-1 p-4 px-6 pt-2">
			<tbody>
				{#if !displayData().length}
					<tr>
						<td colspan="2" class="text-secondary py-8 text-center">
							No data available for {getEntityName(activeTab)}
						</td>
					</tr>
				{:else}
					{#each displayData() as item, i (item.id)}
						<tr
							class="hover:bg-secondary/10 transition-colors"
							in:fade={{ duration: 200, delay: 50 * Math.min(5, i) }}
						>
							<td
								class="bg-background/80 flex w-full items-center gap-2 overflow-hidden rounded-l-lg"
							>
								<span
									class="inline-block h-3 w-3 flex-shrink-0 rounded-full"
									style="background-color: {item.color}"
									title="Color identifier"
								></span>
								<span class="min-w-0 flex-1 overflow-hidden text-ellipsis" title={item.title}>
									{#if item.title === undefined}
										<div
											style="width: {(Math.random() * 0.5 + 0.25) * 100}%"
											class="bg-secondary dark:bg-dark-secondary my-1.5 h-3 animate-pulse rounded-full"
										></div>
									{:else}
										{item.title}
									{/if}
								</span>
							</td>
							<td
								class="bg-background/80 dark:bg-dark-background/80 w-[80px] flex-shrink-0 rounded-r-lg text-right font-medium"
							>
								{item.count}
							</td>
						</tr>
					{/each}

					{#if activeData().length > MAX_VISIBLE_ITEMS}
						<tr>
							<td colspan="2" class="text-secondary py-4 text-center text-sm">
								Showing {MAX_VISIBLE_ITEMS} of {activeData().length} items
							</td>
						</tr>
					{/if}
				{/if}
			</tbody>
		</table>
	</div>
</div>
