<script lang="ts">
	import {
		updateFilteredEventsAndUdateDataForGraph,
		updateLineDataFromTimeline
	} from '$databaseMusiconn/stores/storeGraph';
	import {
		fetchedEvents,
		endYear,
		startYear,
		timeline,
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

	// Ship the cheap per-year histogram first so the line graph renders instantly
	// while the detailed event list streams in.
	timeline.set(data.props.timeline);
	if (!get(useBounderiesYears)) {
		startYear.set(data.props.startYear);
		endYear.set(data.props.endYear);
	}

	if (data.props.timeline && Object.keys(data.props.timeline).length > 0) {
		updateLineDataFromTimeline();
	}

	// Stream the detailed events: `data.props.events` is either a cached object
	// (resolves immediately) or a streaming Promise. Populate the stores once it
	// resolves, preload titles and rebuild the graph/list from the full data.
	(async () => {
		try {
			const events = (await data.props.events) as Events;
			if (events) {
				fetchedEvents.set(events);
				updateFilteredEventsAndUdateDataForGraph();

				// Preload titles once the detailed events are available.
				const eventValues = Object.values(events);
				if (eventValues.length > 0) {
					const allEvents = eventValues.flat();
					import('$databaseMusiconn/stores/storeEvents').then(({ preloadTitlesForEvents }) => {
						preloadTitlesForEvents(allEvents).then(() => {
							console.log('Titles preloaded for', allEvents.length, 'events');
						});
					});
				}
			}
		} catch (error) {
			console.error('Error loading streamed events:', error);
		}
	})();
</script>