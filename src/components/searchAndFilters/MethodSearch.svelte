<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import { updateSelectedMethodFilter, selectedMethodFilter } from '$stores/storeFilters';
	import { Filter, ChevronLeft } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { quintInOut } from 'svelte/easing';

	let isOpen = $state(false);
</script>

<div class="flex items-center">
	{#if !isOpen}
		<button
			class="hover:scale-103"
			in:fly={{ x: -10, duration: 200, easing: quintInOut }}
			onclick={() => (isOpen = !isOpen)}><Filter size={20} strokeWidth={3} /></button
		>
	{/if}
	{#if isOpen}
		<div
			in:fly={{ x: -10, duration: 200, easing: quintInOut }}
			class="group flex place-items-center items-center justify-center gap-1 font-bold"
		>
			<button
				onclick={() => updateSelectedMethodFilter('or')}
				class="undeline uppercase {$selectedMethodFilter === 'or'
					? 'underline'
					: 'no-underline'} decoration-2">{$LL.filters.methods.or()}</button
			>
			<button
				onclick={() => updateSelectedMethodFilter('and')}
				class="undeline uppercase {$selectedMethodFilter === 'and'
					? 'underline'
					: 'no-underline'} decoration-2">{$LL.filters.methods.and()}</button
			>
			<button
				onclick={() => updateSelectedMethodFilter('not')}
				class="undeline uppercase {$selectedMethodFilter === 'not'
					? 'underline'
					: 'no-underline'} decoration-2">{$LL.filters.methods.not()}</button
			>
			<button class="hover:scale-103" onclick={() => (isOpen = !isOpen)}
				><ChevronLeft size={20} strokeWidth={3} /></button
			>
		</div>
	{/if}
</div>
