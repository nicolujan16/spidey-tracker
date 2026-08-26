import * as Location from "expo-location";
import { useEffect, useState } from "react";

export function useUbicacion() {
	const [ubicacion, setUbicacion] = useState<Location.LocationObject | null>(
		null,
	);
	const [permiso, setPermiso] = useState<boolean | null>(null);

	useEffect(() => {
		let suscripcion: Location.LocationSubscription | null = null;

		(async () => {
			const { status } = await Location.requestForegroundPermissionsAsync();
			const otorgado = status === "granted";
			setPermiso(otorgado);
			if (!otorgado) return;

			suscripcion = await Location.watchPositionAsync(
				{
					accuracy: Location.Accuracy.Balanced,
					timeInterval: 10000, // como mucho, un update cada 10s
					distanceInterval: 20, // o cuando te moviste 20 metros
				},
				setUbicacion,
			);
		})();

		return () => suscripcion?.remove();
	}, []);

	return { ubicacion, permiso };
}
