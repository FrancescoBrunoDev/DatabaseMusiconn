<script lang="ts">
	import { LL } from '$lib/i18n/i18n-svelte';

	interface Props {
		options: string[];
		active: string;
	}

	let { options, active = $bindable() }: Props = $props();
</script>

<div class="bg-secondary dark:bg-dark-secondary flex gap-2 rounded-2xl p-1">
	{#each options as option}
		<button
			class="text-text dark:text-dark-text px-2 transition-all sm:px-4 md:py-1"
			class:selected={active === option}
			onclick={() => (active = option)}
		>
			{$LL.graphs[option as 'line' | 'map' | 'pie' | 'tab']() || option}
		</button>
	{/each}
</div>

<style lang="postcss">
	@reference '$tailwind';
	.selected {
		@apply bg-background dark:bg-dark-background rounded-xl;
	}
</style>
