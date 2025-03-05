<script lang="ts">
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import View from '$components/markdown/gallery/View.svelte';
	import Preview from '$components/markdown/gallery/Preview.svelte';
	import { fly } from 'svelte/transition';
	import { quadInOut } from 'svelte/easing';
	import Portal from '$components/ui/Portal.svelte';
	import type { Gallery } from '$components/markdown/gallery/types';

	interface Props {
		gallery: Gallery;
		selected: number;
		isOpen?: boolean;
	}

	let { gallery, selected, isOpen = $bindable() }: Props = $props();

	let images = $derived(
		gallery.images && gallery.images.length > 0
			? gallery.images
			: [
					{
						src: gallery.cover,
						caption: gallery.caption || gallery.title
					}
				]
	);
</script>

<Portal>
	{#if isOpen}
		<div
			in:fly={{ duration: 300, opacity: 0, easing: quadInOut }}
			out:fly={{ y: -20, duration: 300, opacity: 0, easing: quadInOut }}
			class={cn(
				'text-text dark:text-dark-text fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl'
			)}
		>
			<div
				class="text-background dark:text-dark-background dark:text-text relative mx-auto flex h-full w-screen flex-col items-center px-4 py-12 md:px-12 md:py-12"
			>
				<button class="absolute top-4 right-4" onclick={() => (isOpen = false)}>
					<X />
				</button>
				<div class="grid size-full grid-cols-1 grid-rows-6 justify-center gap-4">
					<div
						class={cn('flex', {
							'row-span-6': images.length === 1,
							'row-span-5': images.length > 1
						})}
					>
						{#if images.length > 1}
							<button
								onclick={() => (selected = selected - 1)}
								disabled={selected === 0}
								class="disabled:opacity-50"
							>
								<ChevronLeft class="h-10 w-10" />
							</button>
						{/if}
						<View selected={images[selected]} {gallery} />{' '}
						{#if images.length > 1}
							<button
								onclick={() => (selected = selected + 1)}
								disabled={selected === images.length - 1}
								class="disabled:opacity-50"
							>
								<ChevronRight class="h-10 w-10" />
							</button>
						{/if}
					</div>
					{#if images.length > 1}
						<Preview fallbackCaption={gallery.caption || gallery.title} {images} bind:selected />
					{/if}
				</div>
			</div>
		</div>
	{/if}
</Portal>
