<script lang="ts">
import { scaleLinear, max, line, curveBumpX, color } from 'd3';
import Axis from '$databaseMusiconn/components/graphs/Axis.svelte';
import { startYear, endYear } from '$databaseMusiconn/stores/storeEvents';
import Tooltip from '$databaseMusiconn/components/graphs/line/Tooltip.svelte';

export type DataPoint = {
	year: number;
	value: number;
};

interface Props {
	data?: DataSeries[];
}

export type DataSeries = {
	name: string;
	id: string;
	color: string;
	data: DataPoint[];
};

let { data = [] }: Props = $props();

let width = $state(800);
let height = $state(300);
let margin = $state({ top: 20, right: 0, bottom: 30, left: 20 });

let xDomain = $derived([$startYear, $endYear + 10] as [number, number]);

let allDataPoints = $derived(data.flatMap((d) => d.data));

let xScale = $derived.by(() =>
	scaleLinear()
		.domain(xDomain)
		.range([margin.left, width - margin.right])
);
let yScale = $derived.by(() =>
	scaleLinear()
		.domain([0, (max(allDataPoints, (d) => d.value) as number) + 5])
		.nice()
		.range([height - margin.bottom, margin.top])
);

let lineGenerator = $derived.by(() =>
	line<DataPoint>()
		.x((d) => xScale(d.year))
		.y((d) => yScale(d.value))
		.curve(curveBumpX)
);

let xAxisTicks = $derived.by(() => {
	// Calcola l'intervallo totale di anni
	const yearRange = xDomain[1] - xDomain[0];

	let tickInterval = 5; // intervallo base

	if (yearRange > 200) {
		tickInterval = 50;
	} else if (yearRange > 100) {
		tickInterval = 25;
	} else if (yearRange > 50) {
		tickInterval = 10;
	} else if (yearRange > 30) {
		tickInterval = 5;
	} else {
		// For short intervals, also consider the chart width
		tickInterval = width < 600 ? 2 : 1;
	}

	let ticks = [];
	for (let i = xDomain[0]; i <= xDomain[1]; i += tickInterval) {
		ticks.push(i);
	}

	return ticks;
});

// Ensure each series has a data point for each year in the range
let yearsRange = $derived.by(() => {
	let [minYear, maxYear] = xDomain;
	let years = [];
	for (let year = minYear; year <= maxYear; year++) {
		years.push(year);
	}
	return years;
});
let completeData = $derived.by(() => {
	return data.map((series) => {
		const points = new Map(series.data.map((point) => [point.year, point]));
		const completeSeriesData = yearsRange.map((year) => points.get(year) || { year, value: 0 });
		return { ...series, data: completeSeriesData };
	});
});

let mousePosition: number | null = $state(null);
</script>

<div class="w-full max-w-3xl" bind:clientWidth={width}>
	{#if completeData && width}
		<svg
			class="w-full"
			width={width}
			height={height}
			onmousemove={(event: MouseEvent) => {
				const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
				mousePosition = event.clientX - rect.left - margin.left - 5;
			}}
			onmouseleave={() => {
				mousePosition = null;
			}}
			role="img"
		>
			<Axis
				noDomain={true}
				noTicksLine={true}
				width={width}
				height={height}
				margin={margin}
				scale={xScale}
				position="bottom"
				textColor="hsl(var(--text))"
				removeFirstAndLastTicks={true}
				tickNumber={xAxisTicks.length}
			/>
			<Axis
				noDomain={true}
				noTicksLine={false}
				width={width}
				height={height}
				margin={margin}
				scale={yScale}
				position="left"
				textColor="hsl(var(--secondary))"
				removeFirstTick={true}
			/>
			<g>
				{#each completeData as series}
					<path
						d={lineGenerator(series.data) as string}
						fill="none"
						stroke={series.color}
						stroke-width="2"
					/>
					{#if mousePosition !== null}
						<Tooltip
							mousePosition={mousePosition}
							xScale={xScale}
							yScale={yScale}
							margin={margin}
							height={height}
							xDomain={xDomain}
							series={series}
							data={completeData}
							width={width}
						/>
					{/if}
				{/each}
			</g>
		</svg>
	{:else}
		<p>No data</p>
	{/if}
</div>
