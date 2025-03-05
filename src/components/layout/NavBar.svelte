<script lang="ts">
	import LL from '$lib/i18n/i18n-svelte';
	import { fly } from 'svelte/transition';
	import { quintInOut } from 'svelte/easing';
	import { X } from 'lucide-svelte';
	import ThemeSwitch from '$components/layout/ThemeSwitch.svelte';
	import { page } from '$app/stores';
	import Button from '$components/ui/Button.svelte';
	import { locale } from '$states/stateGeneral.svelte';

	let isHomePage = $derived($page.url.pathname === '/');

	const { value, handleLocaleChange } = $props<{ value: Locales; handleLocaleChange: any }>();

	let isMenuActive = $state(false);

	function toggleMenu() {
		isMenuActive = !isMenuActive;
	}
</script>

<div
	class="fixed top-0 z-40 flex h-10 w-full items-center justify-center {isHomePage
		? 'text-white'
		: 'bg-background dark:bg-dark-background'}"
>
	<div class="container flex justify-between text-lg">
		<ul class="flex items-center">
			{#if !isHomePage}
				<li>
					<a class="font-bold" href="/">{$LL.navbar.home()}</a>
				</li>
			{/if}
		</ul>
		<button onclick={() => toggleMenu()} class="flex gap-3 font-bold hover:scale-103"
			>{$LL.navbar.menu()}</button
		>
		{#if isMenuActive}
			<div
				transition:fly={{
					delay: 50,
					duration: 1000,
					x: 1500,
					easing: quintInOut
				}}
				class="bg-background dark:bg-dark-background text-text dark:text-dark-text absolute top-0 right-0 bottom-0 left-0 z-50 container flex h-dvh flex-col py-8 lg:left-[unset] lg:w-[850px] lg:drop-shadow-2xl"
			>
				<button
					onclick={() => toggleMenu()}
					class="stroke-text dark:stroke-dark-text self-end hover:scale-103 hover:drop-shadow-2xl"
				>
					<X strokeWidth={2.5} size={50} /></button
				>
				<div class="flex h-full items-end justify-between">
					<div
						class="flex h-full items-center gap-6 text-5xl font-bold sm:text-6xl md:items-end md:text-7xl lg:text-8xl"
					>
						<div class="grid grid-cols-1">
							<a
								class="transition-transform duration-75 hover:-translate-y-1"
								onclick={() => toggleMenu()}
								href="/database">{$LL.navbar.database()}</a
							>

							<a
								class="group transition-transform duration-75 hover:-translate-y-1"
								onclick={() => toggleMenu()}
								href="/{locale.current}/exhibitions/">{$LL.navbar.exhibitions()}</a
							>
						</div>
					</div>
					<div class="flex flex-col gap-y-2">
						<Button
							type="button"
							label={value === 'en' ? 'de' : 'en'}
							action={handleLocaleChange}
						/>
						<ThemeSwitch />
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
