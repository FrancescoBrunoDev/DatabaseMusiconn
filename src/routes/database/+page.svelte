<script lang="ts">
	import { updateFilteredEventsAndUdateDataForGraph } from '$databaseMusiconn/stores/storeGraph';
	import { fetchedEvents } from '$databaseMusiconn/stores/storeEvents';
	import { filters } from '$databaseMusiconn/stores/storeFilters';

	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	const { data }: Props = $props();
	// clean filter from precedent
	filters.set({
		and: [],
		or: [],
		not: []
	});

	fetchedEvents.set(data.props.events);

	updateFilteredEventsAndUdateDataForGraph();
</script>
