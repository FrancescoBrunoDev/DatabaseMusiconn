<script lang="ts">
	import ThemeSwitch from '$databaseMusiconn/components/layout/ThemeSwitch.svelte';
	import { page } from '$app/state';
	import Button from '$databaseMusiconn/components/ui/Button.svelte';
	import { cn } from '$databaseMusiconn/lib/utils';
	import Background from './Background.svelte';

	let isHomePage = $derived(page.url.pathname === '/');

	const { value, handleLocaleChange } = $props<{ value: Locales; handleLocaleChange: any }>();
</script>

<div class="fixed inset-x-0 top-3 z-40 flex h-10 items-center justify-center">
	<div class="container">
		<div
			class={cn(
				'bg-border/50 dark:bg-dark-border/50 flex w-full justify-between rounded-xl p-2 text-lg backdrop-blur-lg',
				{
					'justify-end': isHomePage
				}
			)}
		>
			{#if !isHomePage}
				<Button type="button" label="" href="/" className="relative overflow-hidden"
					><Background
						classCanvas="absolute !h-[100px] !w-[100px]"
						color="hsl(var(--border))"
						secondaryColor="hsl(var(--border))"
						lineCount={20}
					/></Button
				>
			{/if}

			<div class="flex gap-x-2">
				<Button type="button" label={value === 'en' ? 'de' : 'en'} action={handleLocaleChange} />
				<ThemeSwitch />
			</div>
		</div>
	</div>
</div>
