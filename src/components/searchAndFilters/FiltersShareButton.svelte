<script lang="ts">
	import { filtersUrlified, urlifyerFilters, filters } from '$stores/storeFilters';
	import { Link } from 'lucide-svelte';

	let isMouseOver: boolean = $state(false);

	let text: string = $state('share your filters');

	function handleClick() {
		urlifyerFilters();
		navigator.clipboard.writeText(`${window.location.origin}/database/${$filtersUrlified}`);
		// change the text of the button to "copied in clipboard" and put the check emoji
		text = 'copied in clipboard 🎉';
	}
	function handleMouseOver() {
		isMouseOver = true;
		text = 'share your filters';
	}
	function handleMouseOut() {
		// await one second
		isMouseOver = false;
	}
</script>

{#if $filters.or.length > 0 || $filters.and.length > 0 || $filters.not.length > 0}
	<div class="flex items-center gap-2">
		{#if isMouseOver}<span class="pl-1 text-sm">{text}</span>
		{/if}
		<button
			onmouseover={handleMouseOver}
			onmouseout={handleMouseOut}
			onfocus={handleMouseOver}
			onblur={handleMouseOut}
			onclick={handleClick}
			aria-label="Toggle italic"
			class="bg-primary dark:bg-dark-primary text-background dark:text-dark-background z-30 flex h-fit w-fit min-w-[2.5rem] flex-row items-center justify-center gap-1 rounded-xl p-2 drop-shadow-sm transition-all hover:scale-103 hover:drop-shadow-xl"
		>
			<Link size={20} />
		</button>
	</div>
{/if}
