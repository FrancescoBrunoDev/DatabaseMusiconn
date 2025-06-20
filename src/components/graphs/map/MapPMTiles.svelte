<script lang="ts">
	// PMTiles map implementation using MapLibre GL and Protomaps
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import * as pmtiles from 'pmtiles';
	import { WHITE, DARK, GRAYSCALE, layers } from '@protomaps/basemaps';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		data: { name: string; geometries: { geo: number[] }[] }[];
	}

	let { data }: Props = $props();

	// DOM element for the map
	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map;
	// Track hovered point ID to show/hide labels
	let hoveredPointId: string | null = null;

	let width = $state(800);
	let height = $state(300);

	// Calculate center point from data, similar to Maps.svelte
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

	// Set up PMTiles protocol
	const setupPMTilesProtocol = () => {
		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol('pmtiles', protocol.tile);
		return protocol;
	};

	onMount(() => {
		const protocol = setupPMTilesProtocol();

		// Create Protomaps white style with our custom PMTiles source
		const pmtilesUrl =
			'https://minio-y8sgkwgsc0wogosk4gc844kk.francesco-bruno.com/protomaps/20250620.pmtiles';

		// Create a style using the WHITE flavor and our PMTiles source
		const style: maplibregl.StyleSpecification = {
			version: 8 as 8,
			glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
			sources: {
				protomaps: {
					type: 'vector',
					url: `pmtiles://${pmtilesUrl}`,
					attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
				}
			},
			layers: layers('protomaps', GRAYSCALE)
		};

		// Initialize the map with the proper Protomaps style
		map = new maplibregl.Map({
			container: mapContainer,
			style: style,
			center: validPoints.length > 0 ? [centerPoint.lng, centerPoint.lat] : [7.626135, 51.962944],
			zoom: 12,
			attributionControl: false
		});

		// After the map loads, add markers for data points
		map.on('load', () => {
			// Use the already calculated valid points and enrich them with name
			const pointsWithNames = data
				.filter((d) => d.geometries?.[0]?.geo)
				.map((d) => ({
					name: d.name,
					coordinates: [d.geometries[0].geo[1], d.geometries[0].geo[0]] // [lng, lat]
				}));

			// Add each point as a simple black dot with a label
			pointsWithNames.forEach((point) => {
				// Create a custom black dot marker using a layer
				const pointId = `point-${point.name.replace(/\s+/g, '-').toLowerCase()}`;
				const labelId = `label-${pointId}`;

				// Add a simple black dot as a circle layer with source
				const pointSource = {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'Point',
							coordinates: point.coordinates
						}
					}
				};

				map.addSource(pointId, pointSource as any);

				// Add point layer
				map.addLayer({
					id: pointId,
					type: 'circle',
					source: pointId,
					paint: {
						'circle-radius': 6,
						'circle-color': '#000000', // Simple black dot
						'circle-stroke-width': 0
					}
				});

				// Add text label source
				map.addSource(labelId, {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {
							name: point.name.split(' ').slice(0, 3).join(' ')
						},
						geometry: {
							type: 'Point',
							coordinates: point.coordinates
						}
					}
				} as any);

				// Add text label layer (initially invisible)
				map.addLayer({
					id: labelId,
					type: 'symbol',
					source: labelId,
					layout: {
						'text-field': ['get', 'name'],
						'text-font': ['Noto Sans Regular'],
						'text-size': 14,
						'text-offset': [1, 0],
						'text-anchor': 'left',
						'text-max-width': 12,
						'text-allow-overlap': true,
						'text-ignore-placement': true,
						'text-padding': 1,
						visibility: 'none' // Initially hidden
					},
					paint: {
						'text-color': '#000000' // Simple black text
					}
				});

				// Add hover events for this point
				map.on('mouseenter', pointId, () => {
					map.getCanvas().style.cursor = 'pointer';
					hoveredPointId = pointId;
					map.setLayoutProperty(labelId, 'visibility', 'visible');
				});

				map.on('mouseleave', pointId, () => {
					map.getCanvas().style.cursor = '';
					hoveredPointId = null;
					map.setLayoutProperty(labelId, 'visibility', 'none');
				});
			});

			// Fit bounds to include all markers if we have valid points
			if (pointsWithNames.length > 0) {
				const bounds = new maplibregl.LngLatBounds();
				pointsWithNames.forEach((point) => {
					bounds.extend(point.coordinates as [number, number]);
				});
				map.fitBounds(bounds, { padding: 50 });
			}
		});
	});

	onDestroy(() => {
		if (map) map.remove();
	});
</script>

<div
	class="loader w-11/12 max-w-3xl overflow-hidden rounded-xl"
	class:loaded={data.length > 0}
	class:loading={data.length === 0}
	bind:clientWidth={width}
	style="height: {height}px;"
>
	<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
</div>

<style>
	/* Simple styling for the map container */
	div {
		background-color: #f8f8f8;
	}
</style>
