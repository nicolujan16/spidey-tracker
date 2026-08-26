import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import type { Sighting } from "../hooks/useSightings";
import { supabase } from "../lib/supabase";
import AvistamientoCard from "./AvistamientoCard";
import PanelCabecera from "./PanelCabecera";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const DEEP = "#0e1c3b";
const FONDO = "#0a1420";
const STEEL = "#154f80";
const BONE = "#eaeadc";
const ALERT = "#ec5147";
const GO = "#52b375";
const DIM = "#4d7a91";

/* La misma ventana que dibuja el mapa */
const VENTANA_MS = 24 * 60 * 60 * 1000;

/* Un historial propio no crece tanto, pero el límite evita traer todo de golpe */
const TOPE = 50;

type Props = {
	visible: boolean;
	onClose: () => void;
	onVerEnMapa: (avistamiento: Sighting) => void;
};

export default function MisAvistamientos({
	visible,
	onClose,
	onVerEnMapa,
}: Props) {
	const { session } = useAuth();
	const userId = session?.user?.id;

	const [lista, setLista] = useState<Sighting[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/*
	 * Sin el recorte de 24 h de useSightings: acá interesa el historial propio, no lo
	 * que está pasando ahora. Por eso también es una consulta aparte y no la del mapa.
	 */
	const cargar = useCallback(async () => {
		if (!userId) return;

		setCargando(true);
		const { data, error: fetchError } = await supabase
			.from("sightings")
			.select("id, latitude, longitude, description, estado, sighted_at")
			.eq("user_id", userId)
			.order("sighted_at", { ascending: false })
			.limit(TOPE);

		if (fetchError) {
			setError(fetchError.message);
		} else {
			setLista(data ?? []);
			setError(null);
		}
		setCargando(false);
	}, [userId]);

	/* Se recarga en cada apertura: mientras estuvo cerrado pudo confirmarse alguno */
	useEffect(() => {
		if (visible) cargar();
	}, [visible, cargar]);

	if (!visible) return null;

	const confirmados = lista.filter((s) => s.estado === "confirmed").length;
	const pendientes = lista.length - confirmados;

	return (
		<View className="absolute inset-0 pt-12" style={{ backgroundColor: FONDO }}>
			<PanelCabecera
				titulo="MIS AVISTAMIENTOS"
				detalle={
					lista.length === TOPE
						? `los últimos ${TOPE} que reportaste`
						: "todo lo que reportaste"
				}
				onClose={onClose}
			/>

			{cargando && lista.length === 0 ? (
				<View className="flex-1 items-center justify-center pt-16">
					<ActivityIndicator color={BONE} />
				</View>
			) : (
				<FlatList
					data={lista}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
					showsVerticalScrollIndicator={false}
					refreshing={cargando}
					onRefresh={cargar}
					ListHeaderComponent={
						<View className="mb-2 flex-row gap-2">
							<Dato valor={lista.length} etiqueta="REPORTADOS" color={BONE} />
							<Dato valor={confirmados} etiqueta="CONFIRMADOS" color={GO} />
							<Dato valor={pendientes} etiqueta="PENDIENTES" color={ALERT} />
						</View>
					}
					renderItem={({ item }) => (
						<AvistamientoCard
							avistamiento={item}
							onVerEnMapa={() => onVerEnMapa(item)}
							enElMapa={
								Date.now() - new Date(item.sighted_at).getTime() < VENTANA_MS
							}
						/>
					)}
					ListEmptyComponent={
						error ? (
							<View className="mt-6 items-center gap-3 px-6">
								<Text
									style={{ fontFamily: MONO, color: ALERT }}
									className="text-center text-[12px] leading-[18px]"
								>
									{error}
								</Text>
								<Reintentar onPress={cargar} />
							</View>
						) : (
							<Text
								style={{ fontFamily: MONO, color: DIM }}
								className="mt-6 text-center text-[12px] leading-[18px]"
							>
								todavía no reportaste ningún avistamiento
							</Text>
						)
					}
				/>
			)}
		</View>
	);
}

/* Casillero del resumen de arriba */
function Dato({
	valor,
	etiqueta,
	color,
}: {
	valor: number;
	etiqueta: string;
	color: string;
}) {
	return (
		<View
			className="flex-1 items-center border-2 py-2"
			style={{ backgroundColor: DEEP, borderColor: INK }}
		>
			<Text style={{ fontFamily: MONO, color }} className="text-[18px]">
				{valor}
			</Text>
			<Text
				style={{ fontFamily: MONO, color: DIM }}
				className="mt-1 text-[10px] tracking-[1px]"
			>
				{etiqueta}
			</Text>
		</View>
	);
}

function Reintentar({ onPress }: { onPress: () => void }) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			accessibilityRole="button"
			className="items-center border-2 px-5 py-2"
			style={{
				backgroundColor: STEEL,
				borderColor: INK,
				borderBottomWidth: pressed ? 2 : 5,
				marginTop: pressed ? 3 : 0,
			}}
		>
			<Text
				style={{ fontFamily: MONO, color: BONE }}
				className="text-[12px] tracking-[1.5px]"
			>
				REINTENTAR
			</Text>
		</Pressable>
	);
}
