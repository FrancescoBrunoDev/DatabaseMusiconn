<script lang="ts">
	interface Props {
		title: string;
		value?: boolean;
	}
	let { title, value = $bindable() }: Props = $props();

	function titleToId(title: string): string {
		return title.replaceAll(' ', '-');
	}
</script>

<form class="justify-self-end">
	<div class="flex items-center rounded-xl p-2">
		<label
			class="w-40 pr-4 text-right text-sm leading-none font-normal"
			for={titleToId(title)}
			id="{titleToId(title)}-label"
		>
			{title}
		</label>
		<button
			class="button-checkbox bg-secondary dark:bg-dark-secondary data-[state=checked]:bg-primary dark:bg-dark-primary dark:border-primary relative h-6 cursor-default rounded-full transition-all duration-100 hover:cursor-pointer hover:shadow-lg dark:border-2"
			id={titleToId(title)}
			aria-labelledby="{titleToId(title)}-label"
			onclick={() => {
				value = !value;
			}}
			data-state={value ? 'checked' : 'unchecked'}
		>
			<span
				class="thumb bg-background dark:bg-dark-background dark:bg-primary dark:bg-dark-primary dark:data-[state=checked]:bg-background dark:bg-dark-background block rounded-full transition"
				data-state={value ? 'checked' : 'unchecked'}
			></span>
		</button>
		<input type="hidden" bind:value />
	</div>
</form>

<style lang="postcss">
	@reference '$tailwind';

	.button-checkbox {
		--w: 2.3rem;
		--padding: 2px;
		width: var(--w);
	}

	.thumb {
		--size: 1rem;
		width: var(--size);
		height: var(--size);
		transform: translateX(var(--padding));
	}

	:global([data-state='checked']) .thumb {
		transform: translateX(calc(var(--w) - var(--size) - var(--padding) - 3px));
	}
</style>
