<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import EventPerformances from './EventPerformances.svelte';
	import {
		getTitles,
		getTitleString,
		getCountersForEvent,
		getFormattedDate
	} from '$stores/storeEvents';
	import { filters } from '$stores/storeFilters';
	import { Circle, FileInput } from 'lucide-svelte';
	import { fly, slide } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		event: EventItem;
		isModalOpen?: boolean;
	}

	let { event, isModalOpen = false }: Props = $props();

	let date: string = $derived.by(() => getFormattedDate({ event }));
	let isEventOpen = $state(false);
	let isOpen = $derived(isModalOpen || isEventOpen);
	let filtersArrayWithCounter: {
		[key: string]: {
			counter: number;
			color: string;
		};
	} = $derived.by(() => getCountersForEvent({ event }));

	function handleClickEvent() {
		isEventOpen = !isEventOpen;
		if (isEventOpen) {
			getTitles(event);
		}
	}
</script>

<div
	class={cn(
		`bg-background dark:bg-dark-background text-text dark:text-dark-text relative overflow-hidden  rounded-xl border-2 transition-all duration-100`,
		{
			'flex shrink-0 flex-col': isOpen,
			'flex w-24 flex-col justify-center gap-2 hover:scale-103': !isOpen,
			'w-80': isEventOpen,
			'h-full w-full border-0 dark:border-2': isModalOpen
		}
	)}
>
	<button
		onclick={() => handleClickEvent()}
		class={cn(`shrink-0 grow-0 font-bold transition-all duration-100 ease-in-out`, {
			'relative top-0 right-0 left-0 h-fit py-2': isOpen,
			'h-24': !isOpen
		})}
		>{date}

		{#if !isOpen}
			<div class="flex flex-wrap justify-center gap-2">
				{#each Object.keys(filtersArrayWithCounter) as key}
					{#if filtersArrayWithCounter[key].counter > 0}
						<span class="flex items-center gap-1 text-sm font-light">
							{filtersArrayWithCounter[key].counter}
							<Circle
								class="shrink-0"
								fill={filtersArrayWithCounter[key].color}
								size={10}
								stroke-opacity={0}
							/>
						</span>
					{/if}
				{/each}
			</div>
		{/if}
		{#if !isOpen}
			<div class="flex flex-wrap justify-center gap-1"></div>
		{/if}
		{#if isOpen}
			<br />
			<span class="text-sm dark:font-semibold">
				{#if event.locations}
					{#each event.locations as location}
						{#await getTitleString(location.location, 'location')}
							<div>loading</div>
						{:then title}
							<div transition:fly={{ y: 10, duration: 100, delay: 200 }}>{title}</div>
						{:catch error}
							<div>Error: {error.message}</div>
						{/await}
					{/each}
				{/if}
			</span>
		{/if}
	</button>
	{#if isOpen}
		<div
			class={cn('flex flex-col gap-4 p-2', {
				'overflow-y-scroll': isOpen
			})}
		>
			{#if event.corporations}
				<div class="flex flex-col gap-1">
					<div>
						<div class="text-base font-bold dark:font-semibold">
							{$LL.filters.entities.corporation()}
						</div>
						{#each event.corporations as corporation}
							{#if corporation.subject == 2}
								{#await getTitleString(corporation.corporation, 'corporation')}
									<div>loading</div>
								{:then title}
									<div class="flex items-center gap-1">
										{#each Object.values($filters).flat() as filter}
											{#if filter.entity === 'corporation' && filter.id == corporation.corporation}
												<Circle class="shrink-0" fill={filter.color} size={10} stroke-opacity={0} />
											{/if}
										{/each}
										<span class="text-sm">{title}</span>
									</div>
								{:catch error}
									<div>Error: {error.message}</div>
								{/await}
							{/if}
						{/each}
					</div>
					<div class="flex w-fit items-center gap-2">
						<div class="text-base font-bold dark:font-semibold">
							{$LL.filters.entities.source()}
						</div>
						{#each event.sources as source}
							{#if source.url}
								<a
									class="hover:scale-103"
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<FileInput strokeWidth={2.25} />
								</a>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
			<div
				class={cn({
					'overflow-y-scroll': isModalOpen
				})}
			>
				<div
					class="bg-background dark:bg-dark-background sticky top-0 w-full text-base font-bold dark:font-semibold"
				>
					{$LL.filters.entities.performances()}
				</div>
				<div
					transition:slide={{ duration: 500, easing: cubicOut }}
					class={cn('divide  flex flex-col gap-1 divide-y-2 rounded-xl dark:font-light', {
						'overflow-y-scroll': isModalOpen
					})}
				>
					{#if event.performances}
						<EventPerformances {event} />
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
