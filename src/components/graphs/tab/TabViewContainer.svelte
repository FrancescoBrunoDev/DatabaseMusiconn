<script lang="ts">
	import { statistic } from '$databaseMusiconn/stores/storeFilters';
	import TabView from './TabView.svelte';

	// Process statistics data for table view
	function prepareChartData(categoryKey: string) {
		if (!$statistic || !$statistic[categoryKey]) return [];

		return Object.entries($statistic[categoryKey])
			.map(([id, data]) => ({
				id,
				count: data.count,
				color: data.color || '#cccccc'
			}))
			.sort((a, b) => b.count - a.count);
	}

	// Data for the four tabs
	const locationData = $derived(prepareChartData('location'));
	const workData = $derived(prepareChartData('work'));
	const composerData = $derived(prepareChartData('composer'));
	const personData = $derived(prepareChartData('person'));
	const corporationData = $derived(prepareChartData('corporation'));

	// find dynamically the parent container width
	let parentContainerWidth = $state(0);
	let parentContainerHeight = $state(0);
</script>

<div
	id="tab-view-container"
	bind:clientWidth={parentContainerWidth}
	bind:clientHeight={parentContainerHeight}
	class="flex h-full w-full overflow-hidden"
>
	<TabView
		{locationData}
		{workData}
		{composerData}
		{personData}
		{corporationData}
		width={parentContainerWidth}
		height={parentContainerHeight}
	/>
</div>
