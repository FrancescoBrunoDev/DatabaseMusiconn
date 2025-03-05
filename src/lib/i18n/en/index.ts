import { map } from 'd3';
import type { BaseTranslation } from '../i18n-types';

const en = {
	filters: {
		search: 'Search',
		methods: {
			or: 'or',
			and: 'and',
			not: 'not'
		},
		entities: {
			person: 'Person',
			performer: 'Performer',
			work: 'Work',
			corporation: 'Corporation',
			location: 'Location',
			performances: 'Performances',
			composer: 'Composer',
			source: 'Source'
		},
		filter: {
			checkboxPerformanceEvent: "show the 'or' events as performances in the graph",
			makeItBothComposerAndPerformer: 'both composer and performer',
			asA: 'as a'
		}
	},
	graphs: {
		line: 'Line',
		map: 'Map'
	},
	events: {
		showAllPerformances: 'Show all performances',
		performedBy: 'Performed by',
		settings: {
			title: 'Settings',
			showMoreOptionsOnFilterOver: 'Show more options on filter over',
			showEventAsModal: 'Show event as modal'
		}
	},
	navbar: {
		menu: 'Menu',
		home: 'Home',
		database: 'Database',
		exhibitions: 'Exhibitions',
	},
	commons: {
		year: 'Year',
		hallo: "Hi",
		codeLang: 'en-GB',
	}
} satisfies BaseTranslation;

export default en;
