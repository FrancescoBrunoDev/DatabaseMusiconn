<script lang="ts">
	// PMTiles map implementation using MapLibre GL and Protomaps
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import * as pmtiles from 'pmtiles';
	import { GRAYSCALE, layers } from '@protomaps/basemaps';
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

	// State to track loading and error status
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);

	// Fetch presigned URL for PMTiles file
	async function getPresignedUrl() {
		try {
			const response = await fetch(
				'/api/map/presigned-url?bucket=protomaps&object=20250620.pmtiles'
			);
			if (!response.ok) {
				throw new Error(`Failed to get presigned URL: ${response.statusText}`);
			}
			const data = await response.json();
			return data.url;
		} catch (err) {
			console.error('Error fetching presigned URL:', err);
			loadError = 'Could not load map tiles: authentication failed';
			throw err;
		}
	}

	onMount(async () => {
		const protocol = setupPMTilesProtocol();
		isLoading = true;

		try {
			// Get the authenticated presigned URL
			const pmtilesUrl = await getPresignedUrl();

			// Create a style using the GRAYSCALE flavor and our PMTiles source
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
				attributionControl: false,
				transformRequest: (url, resourceType) => {
					// Log which resources are being requested
					console.debug(`MapLibre requesting: ${resourceType} - ${url}`);
					return { url };
				}
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

				isLoading = false;
			});

			// Handle map errors
			map.on('error', (e) => {
				console.error('Map error:', e);
				loadError = 'Error loading map: ' + (e.error?.message || 'Unknown error');
				isLoading = false;
			});
		} catch (err) {
			console.error('Error setting up map:', err);
			loadError = err instanceof Error ? err.message : 'Failed to initialize map';
			isLoading = false;
		}
	});

	onDestroy(() => {
		if (map) map.remove();
	});
</script>

<div
	class="loader w-11/12 max-w-3xl overflow-hidden rounded-xl"
	class:loaded={!isLoading && data.length > 0}
	class:loading={isLoading || data.length === 0}
	bind:clientWidth={width}
	style="height: {height}px;"
>
	{#if isLoading}
		<div class="loading-overlay flex items-center justify-center">
			<div class="loader-spinner"></div>
		</div>
	{/if}

	{#if loadError}
		<div class="error-overlay flex items-center justify-center text-center p-4">
			<p class="text-red-600 font-medium">{loadError}</p>
		</div>
	{/if}

	<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
</div>

<style>
	/* Simple styling for the map container */
	div {
		background-color: #f8f8f8;
		position: relative;
	}

	.loading-overlay,
	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 10;
		background-color: rgba(255, 255, 255, 0.8);
	}

	.loader-spinner {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 3px solid rgba(0, 0, 0, 0.1);
		border-top-color: #000;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
