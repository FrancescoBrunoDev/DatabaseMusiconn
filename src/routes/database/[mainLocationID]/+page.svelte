<script lang="ts">
	import {
		updateFilteredEventsAndUdateDataForGraph,
		updateLineDataFromTimeline
	} from '$databaseMusiconn/stores/storeGraph';
	import {
		endYear,
		eventsLoadProgress,
		fetchedEvents,
		mainLocationInfo,
		mergeEvents,
		startYear,
		timeline,
		useBounderiesYears
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
	fetchedEvents.set(undefined);
	eventsLoadProgress.set(0);

	if (data.props.timeline && Object.keys(data.props.timeline).length > 0) {
		updateLineDataFromTimeline();
	}

	// Stream the detailed events page by page: each entry of `eventPages` is a
	// promise (cold) or an already-resolved array (warm cache). As each resolves
	// we accumulate the reshaped events into `fetchedEvents`, refresh the event
	// list, keep the line graph on the full timeline, and advance the progress bar.
	const totalPages = data.props.totalPages || data.props.eventPages.length || 1;
	let resolved = 0;
	let loading = true;

	for (const entry of data.props.eventPages) {
		Promise.resolve(entry)
			.then((page: EventItem[]) => {
				if (!loading) return;
				mergeEvents(page);
				updateFilteredEventsAndUdateDataForGraph();
				// Keep the line graph on the complete timeline (the rebuild above would
				// shrink it to the partially-loaded data). Identical values once loaded.
				updateLineDataFromTimeline();
				resolved++;
				eventsLoadProgress.set(resolved / totalPages);
			})
			.catch((error) => console.error('Error loading an event page:', error));
	}

	// Once every page has resolved, finalize: preload titles, switch the graph to
	// the real computed data and hide the progress bar.
	Promise.all(data.props.eventPages)
		.then(() => {
			loading = false;
			const allEvents = get(fetchedEvents);
			if (allEvents) {
				const flat = Object.values(allEvents).flat();
				if (flat.length > 0) {
					import('$databaseMusiconn/stores/storeEvents').then(({ preloadTitlesForEvents }) => {
						preloadTitlesForEvents(flat).catch((e) => console.error('preload titles:', e));
					});
				}
			}
			updateFilteredEventsAndUdateDataForGraph();
			eventsLoadProgress.set(1);
		})
		.catch((error) => {
			loading = false;
			eventsLoadProgress.set(1);
			console.error('Error loading streamed events:', error);
		});
</script>