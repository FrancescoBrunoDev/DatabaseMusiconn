<script lang="ts">
	import { updateFilteredEventsAndUdateDataForGraph } from '$databaseMusiconn/stores/storeGraph';
	import {
		fetchedEvents,
		endYear,
		startYear,
		useBounderiesYears,
		mainLocationInfo
	} from '$databaseMusiconn/stores/storeEvents';
	import { filters, entitiesForSearchBox } from '$databaseMusiconn/stores/storeFilters';
	import { get } from 'svelte/store';

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

	entitiesForSearchBox.set(['person', 'work', 'corporation', 'location']);

	mainLocationInfo.set(data.props.locationInfo);

	fetchedEvents.set(data.props.events);
	if (!get(useBounderiesYears)) {
		startYear.set(data.props.startYear);
		endYear.set(data.props.endYear);
	}

	updateFilteredEventsAndUdateDataForGraph();
</script>
