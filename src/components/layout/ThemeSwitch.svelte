<script lang="ts">
	import Button from '$components/ui/Button.svelte';
	import { toggleTheme, themeKind } from '$states/stateGeneral.svelte';
	import { draw } from 'svelte/transition';
	import { expoInOut } from 'svelte/easing';
</script>

<Button action={toggleTheme} type="button">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="lucide lucide-sun-medium"
	>
		{#if themeKind.current === 'dark'}
			<path
				in:draw={{ duration: 1000, easing: expoInOut, delay: 500 }}
				out:draw={{ duration: 1000, easing: expoInOut }}
				d="M 2 12 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0"
				transform="translate(12, 12) rotate(90) translate(-12, -12)"
			/>
		{:else}<path
				in:draw={{ duration: 1000, easing: expoInOut, delay: 500 }}
				out:draw={{ duration: 1000, easing: expoInOut }}
				d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
			/>
		{/if}</svg
	>
</Button>
