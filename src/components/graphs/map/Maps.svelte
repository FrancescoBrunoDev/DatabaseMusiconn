<script lang="ts">
	// render a map (dots ) with d3
	import { geoMercator, geoPath } from 'd3-geo';
	import { JSONMuenster } from '$stores/storeGraph';

	interface Props {
		data: { name: string; geometries: { geo: number[] }[] }[];
	}

	let { data }: Props = $props();

	let width = $state(800);
	let height = $state(300);
	let margin = $state({ top: 20, right: 30, bottom: 30, left: 40 });

	const validPoints = data
		.filter((d: { geometries: { geo: any }[] }) => d.geometries?.[0]?.geo)
		.map((d: { geometries: { geo: any }[] }) => d.geometries[0].geo);

	const centerPoint = validPoints.reduce(
		(acc: { lat: number; lng: number }, curr: number[]) => {
			return {
				lat: acc.lat + curr[0] / validPoints.length,
				lng: acc.lng + curr[1] / validPoints.length
			};
		},
		{ lat: 0, lng: 0 }
	);

	const projection = $derived(
		geoMercator()
			.scale(1300000)
			.center([centerPoint.lng, centerPoint.lat])
			.translate([width / 2, height / 2])
	);

	const pathGenerator = $derived(geoPath().projection(projection));
</script>

<div
	class="loader w-11/12 max-w-3xl overflow-hidden rounded-xl"
	class:loaded={data.length > 0}
	class:loading={data.length === 0}
	bind:clientWidth={width}
>
	<svg class="w-full" {width} {height}>
		<g transform={`translate(${margin.left}, ${margin.top})`}>
			<!-- Disegna i confini dei quartieri -->
			{#if $JSONMuenster.features}
				{#each $JSONMuenster.features as feature}
					<path
						d={pathGenerator(feature)}
						fill="none"
						stroke="hsl(var(--secondary))"
						stroke-width="1"
					/>
				{/each}
			{/if}
			{#each data as d}
				{#if d.geometries?.[0]?.geo}
					{@const projectedPoint = projection([d.geometries[0].geo[1], d.geometries[0].geo[0]])}
					{#if projectedPoint}
						<circle cx={projectedPoint[0]} cy={projectedPoint[1]} r="4" fill="hsl(var(--text))" />
						<text
							x={projectedPoint[0] + 10}
							y={projectedPoint[1]}
							font-size="14"
							fill="hsl(var(--text))"
						>
							{d.name.split(' ').slice(0, 3).join(' ')}
						</text>
					{/if}
				{/if}
			{/each}
		</g>
	</svg>
</div>
