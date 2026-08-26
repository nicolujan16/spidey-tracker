import { useMemo } from "react";
import { FlatList, Platform, Text, View } from "react-native";
import type { Sighting } from "../hooks/useSightings";
import AvistamientoCard from "./AvistamientoCard";
import PanelCabecera from "./PanelCabecera";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const FONDO = "#0a1420";
const DIM = "#4d7a91";

type Props = {
	visible: boolean;
	/*
	 * La lista llega desde MainPage, que ya la tiene viva por realtime: así el panel
	 * no abre una segunda suscripción ni muestra algo distinto de lo que hay en el mapa.
	 */
	avistamientos: Sighting[];
	onClose: () => void;
	onVerEnMapa: (avistamiento: Sighting) => void;
};

export default function UltimosAvistamientos({
	visible,
	avistamientos,
	onClose,
	onVerEnMapa,
}: Props) {
	/*
	 * Del más reciente al más viejo. El fetch ya los trae ordenados, pero los que
	 * entran por realtime se apilan arriba sin mirar la fecha: uno reportado "hace
	 * un rato" tiene que caer en su lugar, no arriba de todo.
	 */
	const ordenados = useMemo(
		() =>
			[...avistamientos].sort(
				(a, b) =>
					new Date(b.sighted_at).getTime() - new Date(a.sighted_at).getTime(),
			),
		[avistamientos],
	);

	if (!visible) return null;

	return (
		<View className="absolute inset-0 pt-12" style={{ backgroundColor: FONDO }}>
			<PanelCabecera
				titulo="ÚLTIMOS AVISTAMIENTOS"
				detalle={
					ordenados.length === 1
						? "1 en las últimas 24 h"
						: `${ordenados.length} en las últimas 24 h`
				}
				onClose={onClose}
			/>

			<FlatList
				data={ordenados}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
				showsVerticalScrollIndicator={false}
				renderItem={({ item }) => (
					<AvistamientoCard
						avistamiento={item}
						onVerEnMapa={() => onVerEnMapa(item)}
					/>
				)}
				ListEmptyComponent={
					<Text
						style={{ fontFamily: MONO, color: DIM }}
						className="mt-6 text-center text-[12px] leading-[18px]"
					>
						nadie reportó nada en las últimas 24 h
					</Text>
				}
			/>
		</View>
	);
}
