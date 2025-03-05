import { persistStore } from '$utils/storeUtils';
import { get, writable } from 'svelte/store';

import { type DataSeries } from '$components/graphs/line/LineGraphD3.svelte';
import { endYear, fetchedEvents, startYear } from '$stores/storeEvents';
import { filteredEvents, filters } from '$stores/storeFilters';
import osmtogeojson from 'osmtogeojson';

const selectedGraphType = persistStore<'line' | 'map'>('selectedGraphType', 'line');
const JSONMuenster = persistStore<any>('JSONMuenster', {});
const dataForLineGraph = writable<DataSeries[]>([]);

const updateLineData = async () => {
	let _filters: Filters = get(filters);

	let _fetchedEvents: Events = get(fetchedEvents);

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

const updateFilteredEventsAndUdateDataForGraph = async () => {
	updateLineData();
	let _filters: Filters = get(filters);

	let _fetchedEvents: Events = get(fetchedEvents);

	let _startYear: number = get(startYear);
	let _endYear: number = get(endYear);

	filteredEvents.set({});

	// there should be an yearObj for each year from startYear to endYear
	for (let year = _startYear; year <= _endYear + 10; year++) {
		const events = _fetchedEvents[year as keyof Events] || [];

		const yearObj: DataRecordCoordinates = {
			x: year,
			filters: {},
			eventCount: 0
		};

		if (_filters.or.length > 0 || _filters.and.length > 0 || _filters.not.length > 0) {
			events.forEach((event) => {
				const andConditions =
					_filters.and.length > 0 &&
					_filters.and.every((filter) => hasMatchingPerformances(event, filter));
				const orConditions =
					_filters.or.length > 0 &&
					_filters.or.some((filter) => hasMatchingPerformances(event, filter));
				const notConditions = _filters.not.some((filter) => hasMatchingPerformances(event, filter));

				if (
					!notConditions &&
					_filters.not.length > 0 &&
					_filters.and.length === 0 &&
					_filters.or.length === 0
				) {
					// nel caso in cui ci siano solo not

					filteredEvents.update((currentEvents) => {
						currentEvents[year] = currentEvents[year] || [];
						currentEvents[year].push(event);
						yearObj.eventCount = currentEvents[year].length;
						return { ...currentEvents }; // Return a copy of the modified object
					});
				} else if ((andConditions || orConditions) && !notConditions) {
					filteredEvents.update((currentEvents) => {
						currentEvents[year] = currentEvents[year] || [];
						currentEvents[year].push(event);
						yearObj.eventCount = currentEvents[year].length;

						// Update yearObj.filters with all the or filters
						_filters.or?.forEach((filter) => {
							if (hasMatchingPerformances(event, filter)) {
								const key = filter.id + filter.entity;
								if (yearObj.filters && yearObj.filters[key]) {
									yearObj.filters[key].count = (yearObj.filters[key].count || 0) + 1;
								} else {
									yearObj.filters[key] = { count: 1, color: filter.color };
								}
							}
						});

						// Update yearObj.filters . The key is filter.id + filter.entity in lineGraph
						if (andConditions) {
							if (yearObj.filters && yearObj.filters['and']) {
								yearObj.filters['and'].count = (yearObj.filters['and'].count || 0) + 1;
							} else {
								yearObj.filters['and'] = { count: 1 };
							}
						}

						// Update yearObj.filters with an additional or filter
						if (orConditions) {
							if (yearObj.filters && yearObj.filters['or']) {
								yearObj.filters['or'].count = (yearObj.filters['or'].count || 0) + 1;
							} else {
								yearObj.filters['or'] = { count: 1 };
							}
						}

						return { ...currentEvents }; // Return a copy of the modified object
					});
				}
			});
		} else {
			filteredEvents.update((currentEvents) => {
				currentEvents[year] = events;
				// eliminate the year if there are no events
				if (events.length === 0) {
					delete currentEvents[year];
				}
				return { ...currentEvents }; // Return a copy of the modified object
			});
		}
	}
};

const fetchOverpassData = async (centerPoint: { lat: number; lng: number }) => {
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

			if (performance.persons) {
				for (const person of event.persons) {
					if (filter.entity === 'person' && filter.id === person.person) {
						return true;
					}
				}
			}
		}
	}
	switch (filter.entity) {
		case 'person':
			for (const person of event.persons) {
				if (filter.id === person.person) {
					return true;
				}
			}
			break;
		case 'corporation':
			for (const corporation of event.corporations) {
				if (filter.id === corporation.corporation) {
					return true;
				}
			}
			break;
		case 'location':
			for (const location of event.locations) {
				if (filter.id === location.location) {
					return true;
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
	updateLineData
};
