<script lang="ts">
	import { statistic } from '$databaseMusiconn/stores/storeFilters';
	import { LL } from '$lib/i18n/i18n-svelte';
	import PieChart from './PieChart.svelte';

	// Process statistics data for pie charts
	function prepareChartData(categoryKey: string) {
		if (!$statistic || !$statistic[categoryKey]) return [];

		return Object.entries($statistic[categoryKey])
			.map(([id, data]) => ({
				id,
				count: data.count,
				color: data.color || '#cccccc'
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 12); // Show top 12 items
	}

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

	// Data for the four pie charts
	const locationData = $derived(prepareChartData('location'));
	const workData = $derived(prepareChartData('work'));
	const composerData = $derived(prepareChartData('composer'));
	const personData = $derived(prepareChartData('person'));

	// find dinamically the parent container width
	let parentContainerWidth = $state(0);
	let parentContainerHeight = $state(0);
</script>

<div
	id="pie-chart-container"
	bind:clientWidth={parentContainerWidth}
	bind:clientHeight={parentContainerHeight}
	class="flex h-full w-full snap-x snap-mandatory justify-between gap-4 overflow-scroll"
>
	<PieChart
		data={locationData}
		title={getEntityName('location')}
		width={parentContainerWidth}
		height={parentContainerHeight}
	/>
	<PieChart
		data={workData}
		title={getEntityName('work')}
		width={parentContainerWidth}
		height={parentContainerHeight}
	/>
	<PieChart
		data={composerData}
		title={getEntityName('composer')}
		width={parentContainerWidth}
		height={parentContainerHeight}
	/>
	<PieChart
		data={personData}
		title={getEntityName('person')}
		width={parentContainerWidth}
		height={parentContainerHeight}
	/>
</div>
