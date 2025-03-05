import { urlBaseAPIMusiconn } from '$states/stateGeneral.svelte';
import { fetchedEvents } from '$stores/storeEvents';
import { updateFilteredEventsAndUdateDataForGraph } from '$stores/storeGraph';
import { persistStore } from '$utils/storeUtils';
import { get, writable } from 'svelte/store';

const filtersUrlified = writable<string>('');
const filters = writable<Filters>({
	and: [],
	or: [],
	not: []
});

const selectedMethodFilter = persistStore<Method>('methodFilter', 'and');
const colorFilters = writable([
	'#04c0c7',
	'#e7871a',
	'#da348f',
	'#9089fa',
	'#47e26f',
	'#2780eb',
	'#6f38b1',
	'#268d6c',
	'#d11d55',
	'#ffcc00',
	'#a0d6e5',
	'#f45a6d'
]);
const filteredEvents = writable<Events>({});
const entitiesForSearchBox = writable<Entity[]>(['person', 'corporation', 'work', 'location']);
const isAFilterDragged = writable<boolean>(false);
const isMoveToActive = persistStore<boolean>('isMoveToActive', false);
const showEventAsModal = persistStore<boolean>('showEventAsModal', true);

const updateSelectedMethodFilter = (method: Method) => {
	selectedMethodFilter.set(method);
};

const urlifyerFilters = () => {
	filters.subscribe((res) => {
		const filtersOr = res.or
			.map((filter) => `${filter.entity.substring(0, 3)}:${filter.id}`)
			.join(',');
		const filtersAnd = res.and
			.map((filter) => `${filter.entity.substring(0, 3)}:${filter.id}`)
			.join(',');
		const filtersNot = res.not
			.map((filter) => `${filter.entity.substring(0, 3)}:${filter.id}`)
			.join(',');
		const filtersString = `${filtersOr || '_'}/${filtersAnd || '_'}/${filtersNot || '_'}`;
		filtersUrlified.set(filtersString);
	});
};

const deUrlifyerFilters = async (filtersUrl: FiltersForUrl) => {
	const filtersOr =
		filtersUrl.fo && filtersUrl.fo !== '_'
			? filtersUrl.fo
					.split(',')
					.map((filter) => ({ entity: filter.split(':')[0], id: filter.split(':')[1] }))
			: [];
	const filtersAnd =
		filtersUrl.fa && filtersUrl.fa !== '_'
			? filtersUrl.fa
					.split(',')
					.map((filter) => ({ entity: filter.split(':')[0], id: filter.split(':')[1] }))
			: [];
	const filtersNot =
		filtersUrl.fn && filtersUrl.fn !== '_'
			? filtersUrl.fn
					.split(',')
					.map((filter) => ({ entity: filter.split(':')[0], id: filter.split(':')[1] }))
			: [];

	function whichEntityIs(entity: string) {
		switch (entity) {
			case 'per':
				return 'person' as Entity;
			case 'com':
				return 'composer' as Entity;
			case 'loc':
				return 'location' as Entity;
			case 'wor':
				return 'work' as Entity;
			case 'cor':
				return 'corporation' as Entity;
			default:
				return 'person';
		}
	}
	// use a cicle for for add a filter using the function addFilterElement
	for (const filter of filtersOr) {
		const name = '';
		const entity = whichEntityIs(filter.entity);
		addFilterElement({ suggestion: [name, entity, filter.id] }, 'or');
	}
	for (const filter of filtersAnd) {
		const name = '';
		const entity = whichEntityIs(filter.entity);
		addFilterElement({ suggestion: [name, entity, filter.id] }, 'and');
	}
	for (const filter of filtersNot) {
		const name = '';
		const entity = whichEntityIs(filter.entity);
		addFilterElement({ suggestion: [name, entity, filter.id] }, 'not');
	}
};

const pickColor = () => {
	let _colorFilters: string[] = get(colorFilters);

	const color = _colorFilters[0];
	_colorFilters.splice(0, 1);
	colorFilters.set(_colorFilters);
	return color;
};

const addFilterElement = async (selected: any, method?: Method) => {
	let _method: Method;
	if (method) {
		_method = method;
	} else {
		_method = get(selectedMethodFilter);
	}
	const filter: Filter = {
		name: selected.suggestion[0],
		entity: selected.suggestion[1],
		id: Number(selected.suggestion[2]),
		color: typeof pickColor === 'function' ? pickColor() : undefined
	};

	if (filter.entity == 'person') {
		filter.entity = await isMoreAPersonOrAComposer(Number(filter.id));
	}

	const formattedFilter: Filter = (await formatFilter(filter)) ?? {
		id: filter.id,
		entity: filter.entity,
		name: filter.name,
		birth: undefined,
		death: undefined,
		color: filter.color
	};

	filters.update((currentFilters) => {
		const filterExistsInMethod = currentFilters[_method as keyof Filters]?.some(
			(f) => f.id === formattedFilter.id && f.entity === formattedFilter.entity
		);
		const filterExistsInNot = currentFilters['not'].some(
			(f) => f.id === formattedFilter.id && f.entity === formattedFilter.entity
		);
		if (filterExistsInMethod || filterExistsInNot) {
			return currentFilters;
		} else {
			const updatedFilters = { ...currentFilters };
			updatedFilters[_method as keyof Filters].push(formattedFilter);
			return updatedFilters;
		}
	});
	cleanDoubleFilters();
	updateFilteredEventsAndUdateDataForGraph();
};

const formatPersonName = (person: { name: { split: (arg0: string) => [any, any] } }) => {
	const [lastName, firstName] = person.name.split(',');
	const abbreviatedFirstName = firstName
		.trim()
		.split(' ')
		.map((name: string) => `${name[0]}.`)
		.join(' ');
	return { lastName, firstName, abbreviatedFirstName };
};

const formatFilter = async (filter: Filter) => {
	if (filter.entity === 'composer' || filter.entity === 'person') {
		const res = await fetch(
			`${urlBaseAPIMusiconn}?action=get&person=${filter.id}&props=biography|names&format=json`
		);

		const { person } = await res.json();
		const { biography, names } = person[filter.id];
		const { lastName, firstName, abbreviatedFirstName } = formatPersonName(names[0]);
		const birth = biography?.birth?.dates?.[0]?.date;
		const death = biography?.death?.dates?.[0]?.date;

		return {
			id: filter.id,
			entity: filter.entity,
			name: { lastName, firstName, abbreviatedFirstName },
			birth,
			death,
			color: filter.color
		};
	} else if (filter.entity === 'work') {
		const res = await fetch(
			`${urlBaseAPIMusiconn}?action=get&work=${filter.id}&props=names|composers&format=json`
		);
		const { work } = await res.json();
		const title = work[filter.id].names[0].name;
		const composerId = work[filter.id].composers[0].person;
		const { lastName, abbreviatedFirstName } = await fetch(
			`${urlBaseAPIMusiconn}?action=get&person=${composerId}&props=names&format=json`
		)
			.then((res) => res.json())
			.then((res) => res.person[composerId].names[0])
			.then(formatPersonName);
		return {
			id: filter.id,
			entity: filter.entity,
			name: { title, composer: { lastName, abbreviatedFirstName } },
			color: filter.color
		};
	}
};

const moveFilterElement = (selected: Filter, method: Method, moveTo: Method) => {
	filters.update((currentFilters) => {
		const index = currentFilters[method].findIndex(
			(f) => f.id === selected.id && f.entity === selected.entity
		);
		if (index === -1) {
			return currentFilters;
		}
		const filterToMove = currentFilters[method][index];
		currentFilters[method].splice(index, 1);
		currentFilters[moveTo].push(filterToMove);
		return currentFilters;
	});
	cleanDoubleFilters();
	updateFilteredEventsAndUdateDataForGraph();
};

const removeFilterElement = (selected: Filter, method: Method) => {
	let _colorFilters = get(colorFilters) as string[];

	filters.update((currentFilters) => {
		const index = currentFilters[method].findIndex(
			(f) => f.id === selected.id && f.entity === selected.entity
		);
		if (index === -1) {
			return currentFilters;
		}
		const filterToRemove = currentFilters[method][index];
		currentFilters[method].splice(index, 1);

		if (filterToRemove.color) _colorFilters.push(filterToRemove.color);
		return currentFilters;
	});
	cleanDoubleFilters();
	updateFilteredEventsAndUdateDataForGraph();
};

const changeFilterPersonOrComposer = (selected: Filter, method: Method) => {
	filters.update((currentFilters) => {
		const methodFilters = currentFilters[method];
		if (!methodFilters) return currentFilters;

		const newMethodFilters: Filter[] = methodFilters.map((f) => {
			if (f.id === selected.id && f.entity === selected.entity) {
				const newState = f.entity === 'person' ? 'composer' : 'person';
				return { ...f, entity: newState };
			}
			return f;
		});

		currentFilters[method] = newMethodFilters;
		return currentFilters;
	});
	cleanDoubleFilters();
	updateFilteredEventsAndUdateDataForGraph();
};

function lightenColor(color: string, percent: number) {
	const num = parseInt(color.replace('#', ''), 16),
		amt = Math.round(2.55 * percent),
		R = (num >> 16) + amt,
		B = ((num >> 8) & 0x00ff) + amt,
		G = (num & 0x0000ff) + amt;
	return (
		'#' +
		(
			0x1000000 +
			(R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
			(B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
			(G < 255 ? (G < 1 ? 0 : G) : 255)
		)
			.toString(16)
			.slice(1)
	);
}

const makeFilterPersonBothPersonAndComposer = (selected: Filter, method: Method) => {
	filters.update((currentFilters) => {
		const methodFilters = currentFilters[method];
		if (!methodFilters) return currentFilters;

		const newMethodFilters: Filter[] = methodFilters.flatMap((f) => {
			if (f.id === selected.id && f.entity === selected.entity) {
				return [
					{ ...f, entity: 'person', color: f.color ? lightenColor(f.color, 30) : '#ffffff' },
					{ ...f, entity: 'composer' }
				];
			}
			return f;
		});

		currentFilters[method] = newMethodFilters;
		return currentFilters;
	});
	cleanDoubleFilters();
	updateFilteredEventsAndUdateDataForGraph();
};

const cleanDoubleFilters = () => {
	filters.update((currentFilters) => {
		const temp: { [key: string]: Filter } = {};
		const methods: Method[] = ['not', 'or', 'and'];

		methods.forEach((method) => {
			const methodFilters = currentFilters[method];
			if (!methodFilters) return;

			const newMethodFilters: Filter[] = [];

			methodFilters.forEach((f) => {
				const key = `${f.id}-${f.entity}`;
				if (!temp[key]) {
					temp[key] = f;
					newMethodFilters.push(f);
				}
			});

			currentFilters[method] = newMethodFilters;
		});

		return currentFilters;
	});
};

const isMoreAPersonOrAComposer = async (id: number) => {
	const personId = id;
	let _fetchedEvents: Events = await new Promise((resolve) => {
		fetchedEvents.subscribe((res) => {
			resolve(res);
		});
	});
	let countPerson = 0;
	let countComposer = 0;
	for (const key in _fetchedEvents) {
		const events = _fetchedEvents[key];
		for (const event of events) {
			const persons = event.persons;
			try {
				if (persons.length > 0) {
					for (const person of persons) {
						if (person.person === personId) {
							countPerson++;
						}
					}
				}
			} catch (error) {
				console.error('Si è verificato un errore:', error);
			}
			const performances = event.performances;
			if (performances) {
				for (const performance of performances) {
					const composers = performance.composers;
					if (composers) {
						for (const composer of composers) {
							if (composer.person === personId) {
								countComposer++;
							}
						}
					}
				}
			}
		}
	}
	if (countPerson > countComposer) {
		return 'person';
	} else {
		return 'composer';
	}
};

const updateEntitiesForSearchBox = (selected: Entity) => {
	entitiesForSearchBox.update((currentEntities: Entity[]) => {
		if (currentEntities.includes(selected) && currentEntities.length > 1) {
			const index = currentEntities.indexOf(selected);
			currentEntities.splice(index, 1);
		} else {
			currentEntities.push(selected);
		}
		return currentEntities;
	});
};

export {
	addFilterElement,
	changeFilterPersonOrComposer,
	colorFilters,
	deUrlifyerFilters,
	entitiesForSearchBox,
	filteredEvents,
	filters,
	filtersUrlified,
	isAFilterDragged,
	isMoveToActive,
	makeFilterPersonBothPersonAndComposer,
	moveFilterElement,
	removeFilterElement,
	selectedMethodFilter,
	showEventAsModal,
	updateEntitiesForSearchBox,
	updateSelectedMethodFilter,
	urlifyerFilters
};
