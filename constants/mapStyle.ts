// constants/mapStyle.ts
export const mapStyleDark = [
	{ elementType: "geometry", stylers: [{ color: "#0f172a" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
	{
		featureType: "administrative",
		elementType: "geometry",
		stylers: [{ color: "#1e293b" }],
	},
	{
		featureType: "administrative.locality",
		elementType: "labels.text.fill",
		stylers: [{ color: "#94a3b8" }],
	},
	{
		featureType: "poi",
		elementType: "labels.text.fill",
		stylers: [{ color: "#475569" }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#152238" }],
	},
	{
		featureType: "road",
		elementType: "geometry.fill",
		stylers: [{ color: "#1e293b" }],
	},
	{
		featureType: "road",
		elementType: "labels.text.fill",
		stylers: [{ color: "#64748b" }],
	},
	{
		featureType: "road.arterial",
		elementType: "geometry",
		stylers: [{ color: "#233047" }],
	},
	{
		featureType: "road.highway",
		elementType: "geometry",
		stylers: [{ color: "#2d3d5c" }],
	},
	{
		featureType: "road.highway",
		elementType: "labels.text.fill",
		stylers: [{ color: "#8ba3c7" }],
	},
	{
		featureType: "transit",
		elementType: "geometry",
		stylers: [{ color: "#1a2437" }],
	},
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#060d1a" }],
	},
	{
		featureType: "water",
		elementType: "labels.text.fill",
		stylers: [{ color: "#3d5169" }],
	},
];
