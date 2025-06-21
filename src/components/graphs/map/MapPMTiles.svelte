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
	// Store DOM elements for custom labels
	let labelMarkers: Record<string, HTMLDivElement> = {};

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
				// You can replace this with your own font stack URL
				// Format should be: 'https://your-server.com/fonts/{fontstack}/{range}.pbf'
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
					// Create a CSS-styled label instead of using MapLibre built-in labels
					// This allows us to use our custom Google Font
					const labelElement = document.createElement('div');
					labelElement.className = 'map-label';
					labelElement.textContent = point.name.split(' ').slice(0, 3).join(' ');
					labelElement.style.display = 'none'; // Initially hidden

					// Use our marker as a DOM element that will use our app's fonts
					new maplibregl.Marker({
						element: labelElement,
						anchor: 'left',
						offset: [8, 0]
					})
						.setLngLat(point.coordinates as [number, number])
						.addTo(map);

					// Store reference to customize later
					labelMarkers[pointId] = labelElement;

					// Add text layer (as fallback - will be invisible)
					map.addLayer({
						id: labelId,
						type: 'symbol',
						source: labelId,
						layout: {
							'text-field': ['get', 'name'],
							'text-font': ['Noto Sans Regular'],
							'text-size': 0, // Size zero to be invisible
							visibility: 'none'
						},
						paint: {
							'text-color': '#000000'
						}
					});

					// Add hover events for this point
					map.on('mouseenter', pointId, () => {
						map.getCanvas().style.cursor = 'pointer';
						hoveredPointId = pointId;
						// Show the DOM label instead of changing layout property
						if (labelMarkers && labelMarkers[pointId]) {
							labelMarkers[pointId].style.display = 'block';
						}
					});

					map.on('mouseleave', pointId, () => {
						map.getCanvas().style.cursor = '';
						hoveredPointId = null;
						// Hide the DOM label
						if (labelMarkers && labelMarkers[pointId]) {
							labelMarkers[pointId].style.display = 'none';
						}
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
		<div
			class="absolute top-0 left-0 w-full h-full z-10 bg-background flex items-center justify-center"
		>
			<div class="loader-spinner"></div>
		</div>
	{/if}

	{#if loadError}
		<div
			class="absolute top-0 left-0 w-full h-full z-10 bg-background flex items-center justify-center text-center p-4"
		>
			<p class="text-red-600 font-medium">{loadError}</p>
		</div>
	{/if}

	<div bind:this={mapContainer} style="width: 100%; height: 100%;"></div>
</div>

<style>
	@reference '$tailwind';
	/* Simple styling for the map container */

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

	/* Custom styling for map labels */
	:global(.map-label) {
		@apply bg-background text-text rounded-xl px-2 py-1 text-sm whitespace-nowrap drop-shadow-2xl;
		font-family: 'Outfit', sans-serif; /* Using your Google Font */
	}
</style>
