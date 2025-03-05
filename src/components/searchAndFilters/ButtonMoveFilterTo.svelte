<script lang="ts">
	import { moveFilterElement } from '$stores/storeFilters';
	import { ArrowLeftRight } from 'lucide-svelte';

	interface Props {
		method: Method;
		filter: Filter;
		moveTo: Method;
	}

	let { method, filter, moveTo }: Props = $props();
</script>

<li>
	<button
		onclick={() => moveFilterElement(filter, method, moveTo)}
		class="bg-background dark:bg-dark-background dark:text-text dark:text-dark-text flex w-full items-center justify-between gap-1 rounded-full px-2 transition-transform duration-100 hover:scale-103 hover:shadow-lg"
	>
		move to {moveTo}<ArrowLeftRight size={10} /></button
	>
</li>
