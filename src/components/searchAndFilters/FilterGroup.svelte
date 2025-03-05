<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import { slide, fade } from 'svelte/transition';
	import ActiveFilter from '$components/searchAndFilters/ActiveFilter.svelte';
	import { filters, moveFilterElement, isAFilterDragged } from '$stores/storeFilters';
	import { cn } from '$lib/utils';

	interface Props {
		method: Method;
		color?: string;
	}

	type GroupedFilters = { [key: string]: Filter[] };

	let { method, color = '' }: Props = $props();
	let groupedFilters: GroupedFilters = $state({});

	$effect(() => {
		groupedFilters = $filters[method]?.reduce((grouped: GroupedFilters, filter: Filter) => {
			if (!grouped[filter.entity]) {
				grouped[filter.entity] = [];
			}

			grouped[filter.entity].push(filter);
			return grouped;
		}, {});
	});

	function handleDrop(event: DragEvent) {
		isAFilterDragged.set(false);
		event.preventDefault();
		const { filter, thisMethod } = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}');
		moveFilterElement(filter, thisMethod, method);
	}
</script>

<div
	transition:fade={{ duration: 300 }}
	class="relative text-{color} transition-opacity duration-300 {Object.keys(groupedFilters).length >
		0 || $isAFilterDragged
		? 'opacity-100'
		: 'opacity-10'}"
	ondrop={handleDrop}
	ondragover={(event) => event.preventDefault()}
	role="listbox"
	aria-dropeffect="move"
	tabindex="0"
>
	{#if Object.keys(groupedFilters).length !== 0 || $isAFilterDragged}
		<div
			class="absolute top-0 bottom-0 left-0 flex h-full -translate-x-5 items-center text-xs font-bold uppercase"
			transition:fade={{ duration: 200 }}
		>
			<span style="writing-mode: vertical-rl;" class="rotate-180"
				>{$LL.filters.methods[method]()}</span
			>
		</div>
	{/if}
	<div class="absolute h-full w-1 rounded-full bg-{color}"></div>
	<div
		class="ml-3 pb-2 transition-all duration-200 {$isAFilterDragged
			? 'outline-secondary min-h-10 rounded-sm outline-dotted'
			: 'border-background min-h-1'}"
	>
		{#each Object.keys(groupedFilters) as entity}
			<div
				class="text-text dark:text-dark-text grid pl-2"
				transition:slide={{ axis: 'y', delay: 150 }}
			>
				<h2 class="mb-2 text-sm font-bold">
					{entity === 'person'
						? $LL.filters.entities['performer']()
						: $LL.filters.entities[entity as Entity]()}
				</h2>

				<div class={cn('flex flex-wrap gap-2 transition-all')}>
					{#each groupedFilters[entity] as filter}
						<ActiveFilter {filter} {method} />
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
