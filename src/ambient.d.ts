type MuensterEventsAndChildLocation = {
	location: {
		[key: string]: {
			childs: {
				location: string;
			}[];
		};
	};
};

type DataRecordChart = [
	{
		name: string;
		data: DataRecordCoordinates[];
	}
];

type DataRecordCoordinates = { x: number; filters: FiltersForGraph; eventCount: number };

type FiltersForGraph = {
	[key: string]: FilterForGraph;
};

type FilterForGraph = {
	count?: number;
	color?: string;
};

type filtersCount = {
	[key: string]: number;
};

type Entity = 'location' | 'corporation' | 'person' | 'work' | 'composer';

type AutocompleteResult = [string, string, string] | [];

type Store = {
	selectedPerson: AutocompleteResult[];
};

type Person = {
	person: number;
	subject?: number; // Optional subject property
	order: number;
};

type Composer = {
	person: number;
};

type Medium = {
	subject: number;
};

type EventPerformance = {
	work: number;
	order: number;
	composers?: Composer[];
	persons: Person[];
};

type Source = {
	page: string;
	source: number;
	url: string;
};

type EventLocation = {
	location: number;
};

type EventItem = {
	uid: number;
	locations: EventLocation[];
	dates: DateObject[];
	persons: Person[];
	performances: EventPerformance[];
	corporations: Corporation[];
	metchAnd?: boolean;
	sources: Source[];
};

type Events = {
	[key: string]: EventItem[];
	timestamp?: string;
	timestamp?: string;
};

type Filters = {
	and: Filter[];
	or: Filter[];
	not: Filter[];
};

type Method = 'or' | 'not' | 'and';

type PersonNameFilter = {
	lastName: string;
	firstName?: string;
	abbreviatedFirstName?: string;
};

type WorkNameFilter = {
	title: string;
	composer: PersonNameFilter;
};

type Filter = {
	id: number | string;
	entity: Entity;
	name: PersonNameFilter | WorkNameFilter | string;
	birth?: string;
	death?: string;
	color?: string;
};

type Titles = {
	title: string;
};

type KindKey = 'performances' | 'persons' | 'locations' | 'corporations';

type allTitles = {
	[K in Entity]: { [key: number]: { title: string } };
};

type FiltersForUrl = {
	[key: string]: string;
};

type Locales = 'de' | 'en';

type ThemeKind = 'base' | 'dark';
