<script lang="ts">
	import { bisector } from 'd3';
	import { Tween } from 'svelte/motion';
	import { expoInOut } from 'svelte/easing';
	import { startYear } from '$stores/storeEvents';
	import { type DataPoint, type DataSeries } from '$components/graphs/line/LineGraphD3.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	interface Props {
		xScale: any;
		yScale: any;
		margin: { top: number; right: number; bottom: number; left: number };
		height: number;
		width: number;
		xDomain: [number, number];
		series: DataSeries;
		mousePosition: number;
		data: DataSeries[];
	}

	let { xScale, yScale, margin, height, width, xDomain, series, mousePosition, data }: Props =
		$props();

	const activeYearTween = new Tween($startYear, {
		duration: 500,
		easing: expoInOut
	});

	function getPointOnCurve(data: DataPoint[], year: number) {
		const bisect = bisector((d: DataPoint) => d.year).left;
		const i = bisect(data, year);

		if (i === 0) return data[0];
		if (i >= data.length) return data[data.length - 1];

		const a = data[i - 1];
		const b = data[i];

		const t = (year - a.year) / (b.year - a.year);
		return {
			year,
			value: a.value + (b.value - a.value) * t
		};
	}

	$effect(() => {
		if (mousePosition) {
			const year = Math.round(xScale.invert(mousePosition + margin.left - 10));
			if (year >= xDomain[0] && year <= xDomain[1]) {
				activeYearTween.set(year);
			}
		} else {
			activeYearTween.set($startYear);
		}
	});

	function formatValue(value: number): string {
		return value.toLocaleString('it-IT', {
			maximumFractionDigits: 0
		});
	}

	function getTooltipPosition(x: number, y: number, dimensions: { width: number; height: number }) {
		const offset = 10;
		const topMargin = 20;

		const xPos = x + dimensions.width + offset > width ? x - dimensions.width - offset : x + offset;

		const yPos = topMargin;

		return { x: xPos, y: yPos };
	}

	function getTooltipDimensions(values: Array<{ name: string; value: number }>) {
		const padding = 10;
		const lineHeight = 15;
		const headerHeight = 20;
		const contentHeight = values.length * lineHeight;

		// Calcola la larghezza massima necessaria
		const maxTextWidth =
			Math.max(...values.map((v) => `${v.name}: ${formatValue(v.value)}`.length)) * 6.5;

		return {
			width: Math.max(120, maxTextWidth + padding * 2),
			height: headerHeight + contentHeight + padding * 2
		};
	}

	function getValues(year: number) {
		let values: { name: string; value: number; color: string }[] = [];

		data.forEach((series: DataSeries) => {
			let point = getPointOnCurve(series.data, year);

			values.push({
				name: series.name,
				value: point.value,
				color: series.color
			});
		});
		return values;
	}
</script>

{#if activeYearTween}
	{@const point = getPointOnCurve(data[0].data, activeYearTween.current)}
	{@const currentYear = activeYearTween.current}
	{@const values = getValues(currentYear)}
	{@const dimensions = getTooltipDimensions(values)}
	{@const pos = getTooltipPosition(xScale(currentYear), yScale(values[0].value), dimensions)}
	<line
		x1={xScale(point.year)}
		y1={yScale(point.value)}
		x2={xScale(point.year)}
		y2={height - margin.bottom}
		stroke="hsl(var(--text))"
		stroke-width="1"
		stroke-dasharray="4"
	/>
	<g transform={`translate(${pos.x}, ${pos.y})`}>
		<rect
			width={dimensions.width}
			height={dimensions.height}
			rx="4"
			fill="hsl(var(--background))"
			stroke="hsl(var(--secondary))"
			stroke-width="1"
			opacity="0.95"
		/>
		<text x="10" y="15" font-size="12" fill="hsl(var(--text))">
			{$LL.commons.year()}: {Math.floor(currentYear)}
		</text>
		{#each values as value, i}
			{@const title =
				value.name === 'or' || value.name === 'and' || value.name === 'not'
					? $LL.filters.methods[value.name]()
					: value.name}
			<circle cx="7" cy={26 + i * 15} r="3" fill={value.color} />
			<text x="13" y={30 + i * 15} font-size="12" fill="hsl(var(--text))">
				{title}: {formatValue(value.value)}
			</text>
		{/each}
	</g>
	{#each series.data as _, i}
		{@const point = getPointOnCurve(series.data, activeYearTween.current)}
		<circle
			cx={xScale(point.year)}
			cy={yScale(point.value)}
			r="4"
			fill={series.color}
			stroke="hsl(var(--background))"
			stroke-width="2"
		/>
	{/each}
{/if}
