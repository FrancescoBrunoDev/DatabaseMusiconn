<script lang="ts">
	import { onMount } from 'svelte';
	import GalleryComponent from '$components/markdown/gallery/Gallery.svelte';
	import type { Gallery } from '$components/markdown/gallery/types';

	interface Props {
		src: string;
	}

	let { src }: Props = $props();
	let id = $derived(src);

	let gallery: Gallery | undefined = $state(undefined);

	onMount(async () => {
		const res = await fetch(`/api/exhibitions/pb/getGallery`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ id: id })
		});
		const result = await res.json();
		gallery = result.gallery;
	});
</script>

{#if gallery}
	<GalleryComponent {gallery} />
{/if}
