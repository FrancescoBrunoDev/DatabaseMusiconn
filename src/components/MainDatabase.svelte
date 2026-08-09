<script lang="ts">
import LineGraphD3 from '$databaseMusiconn/components/graphs/line/LineGraphD3.svelte';
import SearchSection from '$databaseMusiconn/components/searchAndFilters/SearchSection.svelte';
import { getIsSearchSectionInEventsList } from '$databaseMusiconn/states/stateSearchSection.svelte';
import { selectedGraphType, dataForLineGraph } from '$databaseMusiconn/stores/storeGraph';
import GraphSelector from '$databaseMusiconn/components/graphs/GraphSelector.svelte';
import { filteredEvents, buildStatistics } from '$databaseMusiconn/stores/storeFilters';
import { getGeometries, getTitleStringAsync } from '$databaseMusiconn/stores/storeEvents';
import { Loader2 } from 'lucide-svelte';

let isOver = $state(false);
let opacitySearchSection = $derived(isOver ? 0.3 : 1);
let blurSearchSection = $derived(isOver ? 4 : 0);
let scaleSearchSection = $derived(isOver ? 0.99 : 1);
let scaleGraphSection = $derived(isOver ? 1.05 : 1);
let bottomDistance = $derived(isOver ? 1 : 0);
let isSearchSectionInEventsList = $derived(getIsSearchSectionInEventsList());

let allLocations: { name: string | undefined; id: number; geometries: any; amount: number }[] =
	$state([]);
let MapPMTiles = $state<any>(null);
let PieChartContainer = $state<any>(null);
let TabViewContainer = $state<any>(null);
let locationsRequest = 0;
const geometryCache = new Map<number, Promise<any>>();

type EventWithLocations = {
	locations: { location: number }[];
};

function getCachedGeometries(id: number) {
	let request = geometryCache.get(id);
	if (!request) {
		request = getGeometries(id);
		geometryCache.set(id, request);
	}
	return request;
}

async function updateLocations(_filteredEvents: Events) {
	const requestId = ++locationsRequest;
	const counts = new Map<number, number>();

	for (const events of Object.values(_filteredEvents || {})) {
		for (const event of events as EventWithLocations[]) {
			for (const location of event.locations || []) {
				const id = Number(location.location);
				counts.set(id, (counts.get(id) || 0) + 1);
			}
		}
	}

	const locations = await Promise.all(
		Array.from(counts, async ([id, amount]) => ({
			name: await getTitleStringAsync(id, 'location'),
			id,
			geometries: await getCachedGeometries(id),
			amount
		}))
	);

	if (requestId === locationsRequest) allLocations = locations;
}

$effect(() => {
	buildStatistics();
	if ($selectedGraphType === 'map') {
		updateLocations($filteredEvents);
	} else {
		locationsRequest++;
		allLocations = [];
	}
});

$effect(() => {
	if ($selectedGraphType === 'map' && !MapPMTiles) {
		import('$databaseMusiconn/components/graphs/map/MapPMTiles.svelte')
			.then(({ default: component }) => (MapPMTiles = component))
			.catch((error) => console.error('Unable to load map:', error));
	} else if ($selectedGraphType === 'pie' && !PieChartContainer) {
		import('$databaseMusiconn/components/graphs/pie/PieChartContainer.svelte')
			.then(({ default: component }) => (PieChartContainer = component))
			.catch((error) => console.error('Unable to load pie chart:', error));
	} else if ($selectedGraphType === 'tab' && !TabViewContainer) {
		import('$databaseMusiconn/components/graphs/tab/TabViewContainer.svelte')
			.then(({ default: component }) => (TabViewContainer = component))
			.catch((error) => console.error('Unable to load tab view:', error));
	}
});
</script>

<div class="flex h-[95dvh] flex-col overflow-hidden pb-12">
	<div
		class="flex grow content-end items-center justify-center transition-all duration-500"
		style={`opacity: ${opacitySearchSection};
                filter: blur(${blurSearchSection}px);
                transform: scale(${scaleSearchSection});`}
	>
		<div
			id="mainSearchSection"
			class="md:w-[500px] lg:w-[600px] {isSearchSectionInEventsList ? 'invisible' : 'visible'}"
		>
			<SearchSection />
		</div>
	</div>
	<div
		onmouseover={() => {
			isOver = true;
		}}
		onmouseout={() => {
			isOver = false;
		}}
		onblur={() => {
			isOver = true;
		}}
		onfocus={() => {
			isOver = false;
		}}
		style={`transform: scale(${scaleGraphSection}); bottom: ${bottomDistance}rem;`}
		role="presentation"
		class="relative flex h-fit items-center justify-center transition-all duration-500"
	>
		{#if $selectedGraphType === 'line'}
			{#if $dataForLineGraph.length > 0}
				<LineGraphD3 data={$dataForLineGraph} />
			{:else}
				<div
					class="bg-secondary dark:bg-dark-secondary flex h-[300px] w-11/12 max-w-3xl animate-pulse items-center justify-center rounded-xl"
				>
					<Loader2 class="h-6 w-6 animate-spin" />
				</div>
			{/if}
		{:else if $selectedGraphType === 'map'}
			{#if MapPMTiles && allLocations.length > 0}
				<MapPMTiles data={allLocations} />
			{:else}
				<div
					class="bg-secondary dark:bg-dark-secondary flex h-[300px] w-11/12 max-w-3xl animate-pulse items-center justify-center rounded-xl"
				>
					<Loader2 class="h-6 w-6 animate-spin" />
				</div>
			{/if}
		{:else if $selectedGraphType === 'pie'}
			<div
				class="border-border flex h-[300px] w-11/12 max-w-3xl items-center justify-center rounded-xl border-2 p-4 pb-0"
			>
				{#if PieChartContainer}<PieChartContainer />{:else}<Loader2
						class="h-6 w-6 animate-spin"
					/>{/if}
			</div>
		{:else if $selectedGraphType === 'tab'}
			<div
				class="border-border flex h-[300px] w-11/12 max-w-3xl items-center justify-center rounded-xl border-2"
			>
				{#if TabViewContainer}<TabViewContainer />{:else}<Loader2
						class="h-6 w-6 animate-spin"
					/>{/if}
			</div>
		{/if}
	</div>
	<div class="mt-4 flex w-full justify-center">
		<GraphSelector />
	</div>
</div>
