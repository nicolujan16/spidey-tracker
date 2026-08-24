import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): Partial<ExpoConfig> => ({
	...config,
	plugins: [
		...(config.plugins ?? []),
		[
			"react-native-maps",
			{
				androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_MAPS_KEY,
				iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_MAPS_KEY,
			},
		],
		[
			"expo-location",
			{
				locationAlwaysAndWhenInUsePermission:
					"Spidey-Tracker necesita tu ubicación para mostrar avistamientos cercanos.",
			},
		],
	],
});
