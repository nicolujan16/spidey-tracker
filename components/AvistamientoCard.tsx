import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import type { Sighting } from "../hooks/useSightings";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const DEEP = "#0e1c3b";
const STEEL = "#154f80";
const BONE = "#eaeadc";
const ALERT = "#ec5147";
const GO = "#52b375";
const DIM = "#4d7a91";

/* "hace 2 h 15 min", contado desde el momento en que se vio */
export function formatearHace(sightedAt: string) {
	const minutos = Math.max(
		0,
		Math.round((Date.now() - new Date(sightedAt).getTime()) / 60_000),
	);

	if (minutos === 0) return "recién";
	if (minutos < 60) return `hace ${minutos} min`;

	const horas = Math.floor(minutos / 60);
	const resto = minutos % 60;
	if (horas < 24) {
		return resto === 0 ? `hace ${horas} h` : `hace ${horas} h ${resto} min`;
	}

	const dias = Math.floor(horas / 24);
	return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

type Props = {
	avistamiento: Sighting;
	onVerEnMapa: () => void;
	/*
	 * El mapa solo dibuja la ventana de 24 h: para uno más viejo no hay pin al que
	 * llevar la cámara, así que el botón se apaga en vez de mentir.
	 */
	enElMapa?: boolean;
};

export default function AvistamientoCard({
	avistamiento,
	onVerEnMapa,
	enElMapa = true,
}: Props) {
	const [pressed, setPressed] = useState(false);
	const confirmado = avistamiento.estado === "confirmed";
	const texto = avistamiento.description?.trim();

	return (
		<View
			className="border-2 px-4 py-3"
			style={{ backgroundColor: DEEP, borderColor: INK }}
		>
			<View className="flex-row items-center gap-2">
				{/* El cuadradito repite el color del pin que le toca en el mapa */}
				<View
					className="h-2.5 w-2.5 border-2"
					style={{ backgroundColor: confirmado ? GO : ALERT, borderColor: INK }}
				/>
				<Text
					style={{ fontFamily: MONO, color: confirmado ? GO : ALERT }}
					className="text-[11px] tracking-[1.5px]"
				>
					{confirmado ? "CONFIRMADO" : "SIN CONFIRMAR"}
				</Text>
				<Text
					style={{ fontFamily: MONO, color: DIM }}
					className="flex-1 text-right text-[11px]"
				>
					{formatearHace(avistamiento.sighted_at)}
				</Text>
			</View>

			<Text
				style={{ fontFamily: MONO, color: texto ? BONE : DIM }}
				className="mt-2 text-[13px] leading-[19px]"
				numberOfLines={3}
			>
				{texto || "sin descripción"}
			</Text>

			<Text
				style={{ fontFamily: MONO, color: DIM }}
				className="mt-1 text-[11px]"
			>
				{Number(avistamiento.latitude).toFixed(5)},{" "}
				{Number(avistamiento.longitude).toFixed(5)}
			</Text>

			<Pressable
				onPress={onVerEnMapa}
				onPressIn={() => setPressed(true)}
				onPressOut={() => setPressed(false)}
				disabled={!enElMapa}
				accessibilityRole="button"
				accessibilityState={{ disabled: !enElMapa }}
				className="items-center border-2 py-2"
				style={{
					backgroundColor: STEEL,
					borderColor: INK,
					opacity: enElMapa ? 1 : 0.45,
					borderBottomWidth: pressed ? 2 : 5,
					marginTop: pressed ? 15 : 12,
				}}
			>
				<Text
					style={{ fontFamily: MONO, color: BONE }}
					className="text-[12px] tracking-[1.5px]"
				>
					{enElMapa ? "VER EN EL MAPA" : "YA NO ESTÁ EN EL MAPA"}
				</Text>
			</Pressable>
		</View>
	);
}
