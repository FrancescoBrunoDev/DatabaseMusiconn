<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		label?: string;
		icon?: any;
		action?: () => void;
		children?: () => any;
		light?: boolean;
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		formAction?: string;
		className?: string;
		disabled?: boolean;
		iconFirst?: boolean;
		href?: string;
		target?: string;
	}

	let {
		label = undefined,
		icon = null,
		action = undefined,
		children = undefined,
		light = false,
		size = 'md',
		type = 'button',
		formAction = undefined,
		className = undefined,
		disabled = false,
		iconFirst = true,
		href = undefined,
		target = undefined
	}: Props = $props();

	const Icon = $derived(icon);
	let formattedLabel = $derived(label?.replace(/\s/g, '-').toLowerCase());

	const buttonClass = cn(
		'flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary dark:bg-dark-primary p-2 text-background dark:text-dark-background transition-all hover:scale-103 hover:drop-shadow-xl',
		{ 'border-2 bg-background dark:bg-dark-background text-text dark:text-dark-text': light },
		{ 'h-8 w-8 text-xs': size === 'sm' },
		{ 'h-10 w-10': size === 'md' },
		{ 'h-12 w-12': size === 'lg' },
		{ 'w-fit px-3': label },
		{ 'opacity-20 cursor-not-allowed hover:scale-100': disabled },
		{ [String(className)]: className }
	);
</script>

{#if href}
	<a {href} {target} class={buttonClass} aria-label={formattedLabel} onclick={action} role="button">
		{#if label}
			<span
				class={cn('text-xs', {
					'text-base': !icon,
					'text-xs': size === 'sm'
				})}>{label}</span
			>
		{/if}
		{#if Icon}
			<Icon
				class={cn('stroke-2', {
					'order-first': iconFirst
				})}
			/>
		{/if}
		{@render children?.()}
		<span class="sr-only">Open Popover</span>
	</a>
{:else}
	<button
		formaction={formAction}
		{type}
		{disabled}
		onclick={action}
		class={buttonClass}
		aria-label={formattedLabel}
	>
		{#if label}
			<span
				class={cn('text-xs', {
					'text-base': !icon,
					'text-xs': size === 'sm'
				})}>{label}</span
			>
		{/if}
		{#if Icon}
			<Icon
				class={cn('stroke-2', {
					'order-first': iconFirst
				})}
			/>
		{/if}
		{@render children?.()}
		<span class="sr-only">Open Popover</span>
	</button>
{/if}
