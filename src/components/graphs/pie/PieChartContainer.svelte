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
</script>

<div class="flex overflow-scroll w-full justify-between gap-4 snap-x snap-mandatory h-full">
	<PieChart data={locationData} title={getEntityName('location')} width={150} height={150} />
	<PieChart data={workData} title={getEntityName('work')} width={150} height={150} />
	<PieChart data={composerData} title={getEntityName('composer')} width={150} height={150} />
	<PieChart data={personData} title={getEntityName('person')} width={150} height={150} />
</div>
