<script lang="ts">
	import {
		removeFilterElement,
		changeFilterPersonOrComposer,
		isAFilterDragged,
		isMoveToActive,
		makeFilterPersonBothPersonAndComposer
	} from '$stores/storeFilters';
	import { createTooltip, melt } from '@melt-ui/svelte';
	import { fade } from 'svelte/transition';
	import { Circle } from 'lucide-svelte';
	import ButtonMoveFilterTo from './ButtonMoveFilterTo.svelte';
	import LL from '$lib/i18n/i18n-svelte';

	interface Props {
		filter: Filter;
		method: Method;
	}

	let { filter, method }: Props = $props();

	const possibleMethods: Method[] = ['or', 'and', 'not'];
	const {
		elements: { trigger, content },
		states: { open }
	} = createTooltip({
		positioning: {
			placement: 'bottom-start'
		},
		openDelay: 200,
		closeDelay: 100,
		closeOnPointerDown: true,
		forceVisible: true
	});

	let isDragging = $state(false);
	let isMouseOver = $state(false);

	function handleDragStart(event: DragEvent) {
		isAFilterDragged.set(true);
		// change the style of the pointer to grab
		const thisMethod = method;
		isDragging = true;
		event.dataTransfer?.setData('text/plain', JSON.stringify({ filter, thisMethod }));
	}

	function handleDragEnd(event: DragEvent) {
		isDragging = false;
	}
</script>

<div
	use:melt={$trigger}
	draggable={true}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	role="button"
	tabindex="0"
	class="bg-primary dark:bg-dark-primary text-background dark:text-dark-background flex items-center gap-1 rounded-full px-3 py-1 text-xs hover:z-20 hover:drop-shadow-lg {isDragging
		? 'cursor-grabbing'
		: 'cursor-grab'}"
>
	{#if method === 'or' || method === 'and'}
		<Circle class="-ml-1" fill={filter.color} size={10} stroke-opacity={0} />
	{/if}
	<button
		type="button"
		class="max-w-xs truncate transition-all hover:line-through"
		onclick={() => removeFilterElement(filter, method)}
		onmouseover={() => (isMouseOver = true)}
		onmouseleave={() => (isMouseOver = false)}
		onblur={() => (isMouseOver = false)}
		onfocus={() => (isMouseOver = true)}
		ondragover={() => (isMouseOver = true)}
	>
		<span>
			{#if typeof filter.name === 'object'}
				{#if 'lastName' in filter.name}
					{#if filter.entity === 'person' || filter.entity === 'composer'}
						{filter.name.lastName}, {#if isMouseOver}{filter.name.firstName}{:else}{filter.name
								.abbreviatedFirstName}{/if}
						{#if filter.birth && filter.death}
							<span class="hidden md:inline-block"
								>({filter.birth.split('-')[0]} - {filter.death.split('-')[0]})</span
							>
						{/if}
					{/if}
				{:else if 'title' in filter.name && filter.entity === 'work'}
					{filter.name.title}, {filter.name.composer.lastName}
					{#if isMouseOver}, {filter.name.composer.abbreviatedFirstName}{/if}
				{/if}
			{:else}
				{filter.name}
			{/if}
		</span>
	</button>
	{#if $open && !isDragging}
		<div use:melt={$content} transition:fade={{ duration: 100 }} class="flex flex-col gap-y-1">
			{#if filter.entity === 'person' || filter.entity === 'composer'}
				<ul
					class="bg-primary dark:bg-dark-primary flex flex-initial flex-col gap-y-1 rounded-xl p-1 text-xs hover:scale-103"
				>
					<li>
						<button
							onclick={() => changeFilterPersonOrComposer(filter, method)}
							class="bg-background dark:bg-dark-background w-full rounded-full px-2 pb-[0.13rem] transition-transform duration-100 hover:scale-103 hover:shadow-lg"
							>{$LL.filters.filter.asA()}
							{#if filter.entity === 'person'}{$LL.filters.entities.composer()}{:else if filter.entity === 'composer'}{$LL.filters.entities.performer()}{/if}</button
						>
					</li>
					<li>
						<button
							onclick={() => makeFilterPersonBothPersonAndComposer(filter, method)}
							class="bg-background dark:bg-dark-background w-full rounded-full px-2 pb-[0.13rem] transition-transform duration-100 hover:scale-103 hover:shadow-lg"
							>{$LL.filters.filter.makeItBothComposerAndPerformer()}</button
						>
					</li>
				</ul>
			{/if}
			{#if $isMoveToActive}
				<ul
					class="bg-primary dark:bg-dark-primary flex flex-initial flex-col gap-y-1 rounded-xl p-1 text-xs hover:scale-103"
				>
					{#each possibleMethods as possibleMethod}
						{#if possibleMethod !== method}
							<ButtonMoveFilterTo {filter} {method} moveTo={possibleMethod} />
						{/if}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
