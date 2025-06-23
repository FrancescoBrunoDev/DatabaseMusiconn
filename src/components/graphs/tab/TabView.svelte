<script lang="ts">
	import { LL } from '$lib/i18n/i18n-svelte';
	import { cn } from '$databaseMusiconn/lib/utils';
	import { getTitleString } from '$databaseMusiconn/stores/storeEvents';
	import Selector from '$databaseMusiconn/components/ui/Selector.svelte';

	interface Props {
		locationData: Array<{ id: string; count: number; color: string }>;
		workData: Array<{ id: string; count: number; color: string }>;
		composerData: Array<{ id: string; count: number; color: string }>;
		personData: Array<{ id: string; count: number; color: string }>;
		width?: number;
		height?: number;
	}

	let {
		locationData = [],
		workData = [],
		composerData = [],
		personData = [],
		width = $bindable(0),
		height = $bindable(0)
	}: Props = $props();

	// Get translated entity names
	function getEntityName(key: string): string {
		const entityKeys: Record<string, keyof typeof $LL.filters.entities> = {
			location: 'location',
			work: 'work',
			composer: 'composer',
			person: 'person'
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
			default:
				return [];
		}
	});

	// Load entity names asynchronously
	let entityNames = $state<Record<string, string>>({});

	$effect(() => {
		loadEntityNames(activeTab, activeData());
	});

	async function loadEntityNames(entityType: string, data: any[]) {
		entityNames = {};
		for (const item of data) {
			try {
				const name = await getTitleString(parseInt(item.id), entityType as any);
				entityNames[item.id] = name || item.id;
			} catch (error) {
				entityNames[item.id] = item.id;
			}
		}
	}
</script>

<div
	class="flex h-full w-full flex-col overflow-hidden"
	style="width: {width}px; height: {height}px;"
>
	<!-- Tabs navigation -->
	<div class="bg-secondary dark:bg-dark-secondary flex gap-2 rounded-2xl p-1 mb-4 mx-auto">
		{#each ['location', 'work', 'composer', 'person'] as tab}
			<button
				class="text-text dark:text-dark-text px-4 py-1 transition-all rounded-xl"
				class:bg-background={activeTab === tab}
				class:dark:bg-dark-background={activeTab === tab}
				onclick={() => (activeTab = tab)}
			>
				{getEntityName(tab)}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	<div class="flex-1 overflow-y-auto">
		<table class="w-full text-text dark:text-dark-text border-separate border-spacing-y-1">
			<!-- <thead>
				<tr class="bg-secondary/20 dark:bg-dark-secondary/20 rounded-lg">
					<th class="py-2 px-4 text-left font-semibold rounded-l-lg">{getEntityName(activeTab)}</th>
					<th class="py-2 px-4 text-right font-semibold rounded-r-lg w-20">#</th>
				</tr>
			</thead> -->
			<tbody>
				{#if activeData().length === 0}
					<tr>
						<td colspan="2" class="py-8 text-center text-secondary dark:text-dark-secondary">
							No data available for {getEntityName(activeTab)}
						</td>
					</tr>
				{:else}
					{#each activeData() as item}
						<tr class="hover:bg-secondary/10 dark:hover:bg-dark-secondary/10 transition-colors">
							<td
								class="py-2 pr-2 flex items-center gap-2 rounded-l-lg bg-background/80 dark:bg-dark-background/80"
							>
								<span
									class="inline-block w-3 h-3 rounded-full"
									style="background-color: {item.color}"
									title="Color identifier"
								></span>
								<span class="truncate">{entityNames[item.id] || `Loading ${item.id}...`}</span>
							</td>
							<td
								class="py-2 px-4 text-right font-medium rounded-r-lg bg-background/80 dark:bg-dark-background/80"
							>
								{item.count}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
