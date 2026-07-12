<script lang="ts">
	import { onMount } from 'svelte';
	import { filteredEvents, showEventAsModal } from '$databaseMusiconn/stores/storeFilters';
	import { eventsLoadProgress, fetchedEvents } from '$databaseMusiconn/stores/storeEvents';
	import { Loader2 } from 'lucide-svelte';
	import Event from '$databaseMusiconn/components/listEvents/Event.svelte';
	import SearchSection from '$databaseMusiconn/components/searchAndFilters/SearchSection.svelte';
	import {
		setIsSearchSectionInEventsList,
		getIsSearchSectionInEventsList,
		getIsSearchSectionInEventsListOpen,
		setIsSearchSectionInEventsListOpen
	} from '$databaseMusiconn/states/stateSearchSection.svelte';
	import { fly } from 'svelte/transition';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { ChevronUp } from 'lucide-svelte';
	import EventWithModal from '$databaseMusiconn/components/listEvents/EventWithModal.svelte';
	import EventModal from '$databaseMusiconn/components/listEvents/EventModal.svelte';

	let selectedEventModal: EventItem | null = $state(null);
	let isModalOpen = $state(false);
	let isSearchSectionInEventsList = $derived(getIsSearchSectionInEventsList());
	let isSearchSectionInEventsListOpen = $derived(getIsSearchSectionInEventsListOpen());

	function toggleSearchSection() {
		setIsSearchSectionInEventsListOpen({ value: !isSearchSectionInEventsListOpen });
	}

	onMount(() => {
		const searchSection = document.getElementById('mainSearchSection');

		if (searchSection) {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setIsSearchSectionInEventsList({ value: false });
					} else {
						if (Object.keys($filteredEvents).length > 4) {
							setIsSearchSectionInEventsList({ value: true });
						} else {
							setIsSearchSectionInEventsList({ value: false });
						}
					}
				},
				{
					threshold: 0.1
				}
			);

			observer.observe(searchSection);
		}
	});
</script>

<div class="flex flex-col">
	{#if $eventsLoadProgress < 1}
		<div class="text-secondary sticky top-0 z-20 mb-3 flex flex-col gap-2 rounded-xl border-2 bg-background/80 p-4 backdrop-blur dark:bg-dark-background/80">
			<div class="flex items-center justify-center gap-2">
				<Loader2 class="h-5 w-5 animate-spin" />
				<span class="text-sm font-medium">Loading events…
					{Math.round($eventsLoadProgress * 100)}%</span>
			</div>
			<div class="bg-border dark:bg-dark-border h-2 w-full overflow-hidden rounded-full">
				<div
					class="bg-primary dark:bg-dark-primary h-full rounded-full transition-all duration-300 ease-out"
					style={`width: ${Math.max(3, $eventsLoadProgress * 100)}%`}
				></div>
			</div>
		</div>
	{/if}
	{#each Object.keys($filteredEvents) as year}
		<div class="flex flex-col">
			<div class="flex flex-row gap-2 align-middle">
				<div class="text-7xl">{year}</div>
				<div>{$filteredEvents[year].length}</div>
			</div>
			<div class="flex flex-wrap items-start gap-2 pb-4 leading-tight">
				{#each $filteredEvents[year].slice().sort((a, b) => {
					const dateA = new Date(a.dates[0].date);
					const dateB = new Date(b.dates[0].date);
					return dateA.getTime() - dateB.getTime();
				}) as event}
					{#if $showEventAsModal}
						<EventWithModal
							bind:isEventOpen={isModalOpen}
							bind:selectedEvent={selectedEventModal}
							{event}
						/>
					{:else}
						<Event {event} isModalOpen={false} />
					{/if}
				{/each}
		</div>
		</div>
	{/each}
</div>

{#if $showEventAsModal}
	<EventModal event={selectedEventModal} bind:isEventOpen={isModalOpen} />
{/if}

{#if Object.keys($filteredEvents).length > 0 && isSearchSectionInEventsList}
	<div class="fixed inset-x-0 bottom-0 flex h-fit justify-center sm:sticky md:bottom-3">
		<div
			transition:fly={{ y: 30, duration: 200, easing: cubicInOut }}
			class={'bg-background dark:bg-dark-background flex h-fit w-full flex-col justify-center rounded-t-xl rounded-b-none border-x-2 border-t-2  px-8 pt-1 pb-4 shadow-2xl md:w-fit md:rounded-xl md:border-2 md:pb-2'}
		>
			<button onclick={toggleSearchSection} class="flex h-fit w-full items-center justify-center">
				<ChevronUp
					class={isSearchSectionInEventsListOpen ? 'rotate-180' : ''}
					size={30}
					stroke-width={40}
				/>
			</button>

			<div id="searchSectionBottom" class="md:w-[40rem]">
				<SearchSection />
			</div>
		</div>
	</div>
{/if}
