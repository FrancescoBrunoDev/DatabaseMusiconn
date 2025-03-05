<script lang="ts">
	import type { LocalizedString } from 'typesafe-i18n';

	interface Props {
		options: { label: LocalizedString | string; value: string }[];
		active: string;
	}

	let { options, active = $bindable() }: Props = $props();
</script>

<div class="bg-secondary dark:bg-dark-secondary flex gap-2 rounded-2xl p-1">
	{#each options as option}
		<button
			class="text-text dark:text-dark-text px-2 transition-all"
			class:selected={active === option.value}
			onclick={() => (active = option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style lang="postcss">
	@reference '$tailwind';
	.selected {
		@apply bg-background dark:bg-dark-background rounded-xl;
	}
</style>
