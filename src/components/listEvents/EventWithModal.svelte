<script lang="ts">
	import { getTitles, getCountersForEvent, getFormattedDate } from '$stores/storeEvents';
	import { Circle } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		event: EventItem;
		selectedEvent?: EventItem;
		isEventOpen?: boolean;
	}

	let { event, selectedEvent = $bindable(), isEventOpen = $bindable() }: Props = $props();

	let date: string = $derived.by(() => getFormattedDate({ event }));
	let filtersArrayWithCounter: {
		[key: string]: {
			counter: number;
			color: string;
		};
	} = $derived.by(() => getCountersForEvent({ event }));

	function handleClickEvent() {
		isEventOpen = !isEventOpen;
		selectedEvent = event;
		if (isEventOpen) {
			getTitles(event);
		}
	}
</script>

<div
	class={cn(
		'text-text dark:text-dark-text relative flex w-fit flex-col justify-center gap-2 overflow-hidden rounded-xl border-2 transition-all duration-100 hover:scale-103'
	)}
>
	<button
		onclick={() => {
			handleClickEvent();
		}}
		class={cn('h-24 w-24 shrink-0 grow-0 font-bold transition-all duration-100 ease-in-out')}
		>{date}

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

		<div class="flex flex-wrap justify-center gap-1"></div>
	</button>
</div>
