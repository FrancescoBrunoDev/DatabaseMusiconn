<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import { Circle, ChevronUp } from 'lucide-svelte';
	import { filters } from '$stores/storeFilters';
	import { getTitleString } from '$stores/storeEvents';
	import EventPerformancesPersons from '$components/listEvents/EventPerformancesPersons.svelte';
	import { fly } from 'svelte/transition';
	interface Props {
		event: EventItem;
	}

	let { event }: Props = $props();

	let isPerformanceOpen = $state(false);
	const methods: Array<keyof typeof $filters> = ['and', 'or', 'not'];

	const hasMatchingFilter = (performance: any) =>
		methods.some((method) =>
			$filters[method].some(
				(filter) =>
					(filter.entity === 'composer' &&
						performance.composers &&
						filter.id == performance.composers[0].person) ||
					(filter.entity === 'work' && filter.id == performance.work) ||
					(filter.entity === 'person' &&
						performance.persons &&
						performance.persons.some(
							(person: { person: typeof filter.id }) => filter.id == person.person
						))
			)
		);

	function handleClickAllPerformances() {
		isPerformanceOpen = !isPerformanceOpen;
	}

	function toRoman(num: number): string {
		const roman = {
			M: 1000,
			CM: 900,
			D: 500,
			CD: 400,
			C: 100,
			XC: 90,
			L: 50,
			XL: 40,
			X: 10,
			IX: 9,
			V: 5,
			IV: 4,
			I: 1
		};
		let str = '';
		for (let i of Object.keys(roman)) {
			let q = Math.floor(num / roman[i as keyof typeof roman]);
			num -= q * roman[i as keyof typeof roman];
			str += i.repeat(q);
		}
		return str;
	}
</script>

{#each event.performances as performance, index}
	{#await getTitleString(performance.work, 'work') then title}
		{#if $filters.or.length === 0 && $filters.and.length === 0 && $filters.not.length === 0}
			<div in:fly={{ y: 20, duration: 100, delay: 200 }}>
				<span class=" font-bold">{toRoman(index + 1)}</span>. {title}
				<EventPerformancesPersons {performance} />
			</div>
		{:else if hasMatchingFilter(performance)}
			<div in:fly={{ y: 20, duration: 100, delay: 200 }} class="flex items-center gap-1">
				<div class="flex flex-col gap-1">
					{#each Object.values($filters).flat() as filter}
						{#if filter.entity === 'composer' && performance.composers && filter.id == performance.composers[0].person}
							<Circle class="shrink-0" fill={filter.color} size={10} stroke-opacity={0} />
						{/if}
						{#if filter.entity === 'work' && filter.id == performance.work}
							<Circle class="shrink-0" fill={filter.color} size={10} stroke-opacity={0} />
						{/if}
						{#if filter.entity === 'person'}
							{#each performance.persons as person}
								{#if filter.id == person.person}
									<Circle class="shrink-0" fill={filter.color} size={10} stroke-opacity={0} />
								{/if}
							{/each}
						{/if}
					{/each}
				</div>
				<div>
					<span class=" font-bold">{toRoman(index + 1)}</span>. {title}<EventPerformancesPersons
						{performance}
					/>
				</div>
			</div>
		{:else if isPerformanceOpen}
			<div in:fly={{ y: 20, duration: 100, delay: 200 }}>
				<span class=" font-bold">{toRoman(index + 1)}</span>. {title}<span
					><EventPerformancesPersons {performance} /></span
				>
			</div>
		{/if}
	{:catch error}
		<div>Error: {error.message}</div>
	{/await}
{/each}
{#if $filters.or.length > 0 || $filters.and.length > 0 || $filters.not.length > 0}
	<button onclick={() => handleClickAllPerformances()}>
		{#if isPerformanceOpen}
			<ChevronUp class="h-8 w-full items-center" />
		{:else}
			{$LL.events.showAllPerformances()}
		{/if}
	</button>
{/if}
