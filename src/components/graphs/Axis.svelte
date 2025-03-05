<script lang="ts">
	import { select } from 'd3-selection';
	import { axisBottom, axisLeft, type AxisDomain } from 'd3-axis';
	import { format } from 'd3-format';

	interface Props {
		width: number;
		height: number;
		margin: { top: number; right: number; bottom: number; left: number };
		position: 'bottom' | 'left';
		scale: any;
		tickOuter?: number;
		tickNumber?: number;
		toFormat?: boolean;
		noDomain?: boolean;
		formatString?: string;
		format_mobile?: boolean;
		noTicksLine?: boolean;
		textColor?: string;
		removeFirstAndLastTicks?: boolean;
		removeFirstTick?: boolean;
	}

	let {
		width,
		height,
		margin,
		position,
		scale,
		tickOuter = 0,
		tickNumber = 5,
		toFormat = false,
		noDomain = true,
		formatString = '$.0f',
		format_mobile = false,
		noTicksLine = false,
		textColor = 'hsl(var(--secondary))',
		removeFirstAndLastTicks = false,
		removeFirstTick = false
	}: Props = $props();

	const formatMobile = (tick: AxisDomain) => {
		return "'" + tick.toString().slice(13, 15);
	};

	const formatter = format(formatString);
	const yearFormatter = format('.0f');
	let transform = $state('');
	let g: SVGGElement;

	$effect(() => {
		select(g).selectAll('*').remove();

		let axis;
		let tickSize = width - margin.left - margin.right;

		if (width && scale) {
			switch (position) {
				case 'bottom':
					if (format_mobile) {
						axis = axisBottom(scale)
							.tickFormat((d) => formatMobile(d))
							.tickSizeOuter(tickOuter)
							.ticks(10);
						transform = `translate(0, ${height - margin.bottom})`;
					} else {
						axis = axisBottom(scale)
							.tickFormat((d) => yearFormatter(Number(d)))
							.tickSizeOuter(tickOuter)
							.ticks(tickNumber);
						transform = `translate(0, ${height - margin.bottom})`;
					}
					break;
				case 'left':
					if (toFormat) {
						axis = axisLeft(scale)
							.tickSize(-tickSize)
							.tickSizeOuter(tickOuter)
							.tickFormat((d) => formatter(Number(d)))
							.ticks(tickNumber);
						transform = `translate(${margin.left}, 0)`;
					} else {
						axis = axisLeft(scale).tickSize(-tickSize).ticks(tickNumber).tickSizeOuter(tickOuter);
						transform = `translate(${margin.left}, 0)`;
					}
			}

			if (axis) {
				const axisSelection = select(g).call(axis);
				if (noDomain) {
					axisSelection.select('.domain').remove();
				}
				if (noTicksLine) {
					axisSelection.selectAll('.tick').selectAll('line').remove();
				}
				if (removeFirstAndLastTicks) {
					axisSelection
						.selectAll('.tick')
						.filter((d, i) => i === 0 || i === axisSelection.selectAll('.tick').size() - 1)
						.remove();
				}
				if (removeFirstTick) {
					axisSelection
						.selectAll('.tick')
						.filter((d, i) => i === 0)
						.remove();
				}
				axisSelection
					.selectAll('text')
					.attr('fill', textColor)
					.attr('font-size', '13px')
					.attr('font-family', 'Outfit');

				axisSelection.selectAll('.tick').selectAll('line').attr('stroke', textColor);
			}
		}
	});
</script>

<g class="axis" bind:this={g} {transform} />

<style lang="postcss">
	@reference '$tailwind';
	.axis {
		shape-rendering: crispEdges;
	}
</style>
