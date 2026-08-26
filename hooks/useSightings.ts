import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Sighting = {
	id: string;
	latitude: number;
	longitude: number;
	description: string | null;
	estado: "pending" | "confirmed";
	sighted_at: string;
};

export function useSightings() {
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchSightings = useCallback(async () => {
		const { data, error: fetchError } = await supabase
			.from("sightings")
			.select("id, latitude, longitude, description, estado, sighted_at")
			.gte(
				"sighted_at",
				new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			)
			.order("sighted_at", { ascending: false });

		if (fetchError) {
			setError(fetchError.message);
		} else {
			setSightings(data ?? []);
			setError(null);
		}
		setCargando(false);
	}, []);

	useEffect(() => {
		fetchSightings();
	}, [fetchSightings]);

	useEffect(() => {
		const canal = supabase
			.channel("sightings-changes")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "sightings" },
				(payload) => {
					const nuevo = {
						...payload.new,
						latitude: Number(payload.new.latitude),
						longitude: Number(payload.new.longitude),
					} as Sighting;
					setSightings((prev) =>
						prev.some((s) => s.id === nuevo.id) ? prev : [nuevo, ...prev],
					);
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "sightings" },
				(payload) => {
					const actualizado = payload.new as Sighting;
					setSightings((prev) =>
						prev.map((s) => (s.id === actualizado.id ? actualizado : s)),
					);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(canal);
		};
	}, []);

	return { sightings, cargando, error, refetch: fetchSightings };
}
