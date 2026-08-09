import { persistStore } from '$databaseMusiconn/utils/storeUtils';
import { get, writable } from 'svelte/store';

import { type DataSeries } from '$databaseMusiconn/components/graphs/line/LineGraphD3.svelte';
import { endYear, fetchedEvents, startYear, timeline } from '$databaseMusiconn/stores/storeEvents';
import { filteredEvents, filters } from '$databaseMusiconn/stores/storeFilters';

const selectedGraphType = persistStore<'line' | 'map' | 'pie' | 'tab'>('selectedGraphType', 'line');
const JSONMuenster = persistStore<any>('JSONMuenster', {});
const dataForLineGraph = writable<DataSeries[]>([]);

const updateLineData = async () => {
	let _filters: Filters = get(filters);

	let _fetchedEvents: Events = get(fetchedEvents) ?? {};

	let _startYear: number = get(startYear);
	let _endYear: number = get(endYear);

	let _dataForLineGraph: DataSeries[] = [];

	// for each filter in or and and make a new entry in test
	if (_filters.or.length > 1) {
		_dataForLineGraph.push({
			name: 'or',
			id: 'or',
			color: 'hsl(var(--secondary))',
			data: []
		});
	}

	_dataForLineGraph.push({
		name: 'and',
		id: 'and',
		color: 'hsl(var(--text))',
		data: []
	});

	if (_filters.or.length > 0 && _filters.and.length === 0) {
		_dataForLineGraph = _dataForLineGraph.filter((filter) => filter.name !== 'and');
	}

	_filters.or.forEach((filter) => {
		const formattedName =
			((typeof filter?.name === 'object' && 'lastName' in filter.name
				? filter.name.lastName + ', ' + filter.name.abbreviatedFirstName
				: '') ||
				(typeof filter?.name === 'object' && 'title' in filter.name ? filter.name.title : '') ||
				filter?.name) ??
			'';
		_dataForLineGraph.push({
			name: String(formattedName),
			id: String(filter.id),
			color: filter.color || 'hsl(var(--text))',
			data: []
		});
	});

	for (let year = _startYear; year <= _endYear + 10; year++) {
		const events = _fetchedEvents[year as keyof Events] || [];

		// add for each filter in test the year and value as 0
		_dataForLineGraph.forEach((filter) => {
			filter.data.push({ year: year, value: 0 });
		});

		if (_filters.or.length === 0 && _filters.and.length === 0 && _filters.not.length === 0) {
			// update the test value for and
			const index = _dataForLineGraph.findIndex((filter) => filter.name === 'and');
			_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value +=
				events.length;
		} else if (_filters.or.length === 0 && _filters.and.length === 0 && _filters.not.length > 0) {
			// handle the case there are only not filters
			const index = _dataForLineGraph.findIndex((filter) => filter.name === 'and');
			_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value +=
				events.length;
			events.forEach((event) => {
				const notConditions = _filters.not.some((filter) => hasMatchingPerformances(event, filter));

				if (notConditions) {
					_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value -= 1;
				}
			});
		} else {
			events.forEach((event) => {
				const andConditions =
					_filters.and.length > 0 &&
					_filters.and.every((filter) => hasMatchingPerformances(event, filter));
				const orConditions =
					_filters.or.length > 0 &&
					_filters.or.some((filter) => hasMatchingPerformances(event, filter));
				const notConditions = _filters.not.some((filter) => hasMatchingPerformances(event, filter));

				if (notConditions) {
					// salta l'evento
					return;
				}

				if (andConditions) {
					const index = _dataForLineGraph.findIndex((filter) => filter.name === 'and');
					_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value += 1;
				}

				if (orConditions) {
					// update the test value for or
					if (_filters.or.length > 1) {
						const index = _dataForLineGraph.findIndex((filter) => filter.name === 'or');
						_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value += 1;
					}

					// update the value for the filter that has matched
					_filters.or.forEach((filter) => {
						if (hasMatchingPerformances(event, filter)) {
							const index = _dataForLineGraph.findIndex((f) => f.id === String(filter.id));
							_dataForLineGraph[index].data[_dataForLineGraph[index].data.length - 1].value += 1;
						}
					});
				}
			});
		}
	}
	// update dataForLineGraph
	dataForLineGraph.set(_dataForLineGraph);
};

/**
 * Render the line graph instantly from the cheap per-year `timeline` histogram
 * (the new API returns this in <0.2s). This is the "no filters" total line,
 * identical to what `updateLineData` computes from the full event list when no
 * filters are active. Called before the detailed events have streamed in so the
 * UI is never blank; replaced by the full computation once events arrive.
 */
const updateLineDataFromTimeline = () => {
	const _timeline = get(timeline);
	const _startYear = get(startYear);
	const _endYear = get(endYear);
	const series: DataSeries[] = [{ name: 'and', id: 'and', color: 'hsl(var(--text))', data: [] }];
	for (let year = _startYear; year <= _endYear + 10; year++) {
		series[0].data.push({ year, value: _timeline[String(year)] || 0 });
	}
	dataForLineGraph.set(series);
};

const updateFilteredEventsAndUdateDataForGraph = async () => {
	const currentFilters = get(filters);
	const loadedEvents = get(fetchedEvents) ?? {};
	const filtered: Events = {};
	const start = get(startYear);
	const end = get(endYear);
	const hasAndOrFilters = currentFilters.and.length > 0 || currentFilters.or.length > 0;
	const hasFilters = hasAndOrFilters || currentFilters.not.length > 0;

	for (let year = start; year <= end + 10; year++) {
		const events = loadedEvents[year as keyof Events] || [];
		if (!hasFilters) {
			if (events.length > 0) filtered[year] = events;
			continue;
		}

		const selected = events.filter((event) => {
			const excluded = currentFilters.not.some((filter) => hasMatchingPerformances(event, filter));
			if (excluded) return false;
			if (!hasAndOrFilters) return true;

			const andMatches =
				currentFilters.and.length > 0 &&
				currentFilters.and.every((filter) => hasMatchingPerformances(event, filter));
			const orMatches =
				currentFilters.or.length > 0 &&
				currentFilters.or.some((filter) => hasMatchingPerformances(event, filter));
			return andMatches || orMatches;
		});

		if (selected.length > 0) filtered[year] = selected;
	}

	// Notify subscribers once per batch instead of once per year/event. This keeps
	// the event list, map and statistics from doing repeated full recalculations.
	filteredEvents.set(filtered);
	updateLineData();
};

const fetchOverpassData = async (centerPoint: { lat: number; lng: number }) => {
	const { default: osmtogeojson } = await import('osmtogeojson');
	const radius = 2; // km
	const bbox = [
		centerPoint.lat - radius / 111, // 1 degree latitude ~ 111 km
		centerPoint.lng - radius / (111 * Math.cos(centerPoint.lat * (Math.PI / 180))),
		centerPoint.lat + radius / 111,
		centerPoint.lng + radius / (111 * Math.cos(centerPoint.lat * (Math.PI / 180)))
	];

	const query = `
		[bbox:${bbox.join(',')}]
		[out:json]
		[timeout:90];
		(
			way["highway"]["highway"!~"cycleway|footway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
			way["waterway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
		);
		out geom;
	`;

	const response = await fetch('https://overpass-api.de/api/interpreter', {
		method: 'POST',
		body: 'data=' + encodeURIComponent(query)
	});
	const result = await response.json();
	let geojson = osmtogeojson(result); // Convert to GeoJSON

	JSONMuenster.set(geojson);
};

const hasMatchingPerformances = (event: EventItem, filter: Filter) => {
	const performances = event.performances || [];
	// manage the case in witch event.performances does not exist

	if (event.performances) {
		for (const performance of performances) {
			// se composers esiste controlla se hasMatchingPerformance
			if (performance.composers) {
				for (const composer of performance.composers) {
					if (filter.entity === 'composer' && filter.id === composer.person) {
						return true;
					}
				}
			}

			// controlla se work hasMatchingPerformance
			if (filter.entity === 'work' && filter.id === performance.work) {
				return true;
			}

			if (
				filter.entity === 'person' &&
				performance.persons?.some((person) => filter.id === person.person)
			) {
				return true;
			}
		}
	}
	switch (filter.entity) {
		case 'person':
			if (event.persons) {
				for (const person of event.persons) {
					if (filter.id === person.person) {
						return true;
					}
				}
			}
			break;
		case 'corporation':
			if (event.corporations) {
				for (const corporation of event.corporations) {
					if (filter.id === corporation.corporation) {
						return true;
					}
				}
			}
			break;
		case 'location':
			if (event.locations) {
				for (const location of event.locations) {
					if (filter.id === location.location) {
						return true;
					}
				}
			}
			break;
	}

	return false;
};

export {
	dataForLineGraph,
	fetchOverpassData,
	filteredEvents,
	JSONMuenster,
	selectedGraphType,
	updateFilteredEventsAndUdateDataForGraph,
	updateLineData,
	updateLineDataFromTimeline
};
