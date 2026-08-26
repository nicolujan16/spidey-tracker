import { Image, ImageBackground } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Platform,
	Pressable,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { LongPressEvent } from "react-native-maps";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { mapStyleDark } from "../constants/mapStyle";
import { distanciaEnMetros } from "../hooks/distancia";
import { type Sighting, useSightings } from "../hooks/useSightings";
import { useUbicacion } from "../hooks/useUbicacion";
import { supabase } from "../lib/supabase";
import MenuHamburguesa from "./MenuHamburguesa";
import PinAvistamiento from "./PinAvistamiento";
import SightingForm, { type Coords } from "./SightingForm";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const BONE = "#eaeadc";
const SKY = "#96e0f7";
const DIM = "#4d7a91";
const ALERT = "#ec5147";
const GO = "#52b375";
const INK = "#1e1e14";
const DEEP = "#0e1c3b";

const textos = {
	es: { reportar: "Reportar avistamiento", cercanos: "Cercanos" },
	en: { reportar: "Report sighting", cercanos: "Nearby" },
};

/* Los recortes de filtro son de 170x140; la caja respeta esa proporción */
const FILTRO_W = 54;
const FILTRO_H = Math.round((FILTRO_W * 140) / 170);

const filtros = {
	confirmado: require("../assets/images/marco/filter_green.png"),
	pendiente: require("../assets/images/marco/filter_red.png"),
};

/* Pantalla en blanco: acá va el mapa. Ocupa el hueco 2-2 del TrackerFrame. */
export default function MainPage() {
	const [signingOut, setSigningOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [idioma, setIdioma] = useState<"es" | "en">("es"); // Estado para el idioma
	const { sightings, refetch } = useSightings();
	const { ubicacion, permiso } = useUbicacion();
	/* Para mover la cámara a mano cuando se prende el filtro de cercanos */
	const mapRef = useRef<MapView>(null);

	/*
	 * El formulario se monta una sola vez y se muestra u oculta con formAbierto.
	 * Cuando el usuario elige marcar el punto en el mapa el modal se cierra pero el
	 * componente sigue vivo, así al volver conserva lo que ya había escrito.
	 * formKey se incrementa solo al abrir uno nuevo, para arrancar en limpio.
	 */
	const [formAbierto, setFormAbierto] = useState(false);
	const [formKey, setFormKey] = useState(0);
	const [marcandoEnMapa, setMarcandoEnMapa] = useState(false);
	const [marcaMapa, setMarcaMapa] = useState<Coords | null>(null);
	const [confirmacion, setConfirmacion] = useState<string | null>(null);
	/* El botón de cercanos alterna entre todos los pines y los de RADIO_CERCA a la redonda */
	const [soloCercanos, setSoloCercanos] = useState(false);

	/* Filtro por estado: null es todos. Los dos botones se excluyen entre sí */
	const [filtroEstado, setFiltroEstado] = useState<
		"confirmed" | "pending" | null
	>(null);

	// Calcular avistamientos cercanos a la ubicación actual, si hay permiso y ubicación disponible
	const RADIO_CERCA = 5000;
	const cercanos = useMemo(() => {
		if (!ubicacion) return [];
		return sightings
			.map((s) => ({
				...s,
				distancia: distanciaEnMetros(
					ubicacion.coords.latitude,
					ubicacion.coords.longitude,
					Number(s.latitude),
					Number(s.longitude),
				),
			}))
			.filter((s) => s.distancia <= RADIO_CERCA)
			.sort((a, b) => a.distancia - b.distancia);
	}, [sightings, ubicacion]);

	/* Los dos filtros se encadenan: primero el radio, después el estado */
	const visibles = useMemo(() => {
		/* Sin ubicación no hay con qué comparar, así que el radio no se aplica */
		const enRadio: Sighting[] =
			soloCercanos && ubicacion ? cercanos : sightings;

		return filtroEstado
			? enRadio.filter((s) => s.estado === filtroEstado)
			: enRadio;
	}, [cercanos, filtroEstado, sightings, soloCercanos, ubicacion]);

	/*
	 * Prender el filtro sin tocar la cámara puede parecer que borró los pines: si el
	 * mapa quedó lejos, filtrar por radio deja la vista vacía. Por eso encuadra tu punto.
	 */
	const alternarCercanos = () => {
		const activar = !soloCercanos;
		setSoloCercanos(activar);

		if (activar && ubicacion) {
			mapRef.current?.animateToRegion(
				{
					latitude: ubicacion.coords.latitude,
					longitude: ubicacion.coords.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				},
				800,
			);
		}
	};

	/* Tocar el filtro activo lo apaga; tocar el otro cambia de estado */
	const alternarEstado = (estado: "confirmed" | "pending") => {
		setFiltroEstado((actual) => (actual === estado ? null : estado));
	};

	/*
	 * Lo piden las listas del menú. Si algún filtro dejaba ese pin afuera se apagan:
	 * llevar la cámara hasta un punto vacío se vería como que "no está".
	 */
	const verEnMapa = (avistamiento: Sighting) => {
		if (!visibles.some((v) => v.id === avistamiento.id)) {
			setSoloCercanos(false);
			setFiltroEstado(null);
		}

		mapRef.current?.animateToRegion(
			{
				latitude: Number(avistamiento.latitude),
				longitude: Number(avistamiento.longitude),
				latitudeDelta: 0.01,
				longitudeDelta: 0.01,
			},
			800,
		);
	};

	const handleSignOut = async () => {
		if (signingOut) return;
		setError(null);
		setSigningOut(true);

		const { error: signOutError } = await supabase.auth.signOut();
		setSigningOut(false);

		if (signOutError) {
			setError(signOutError.message);
		}

		/* Sin navegación: al quedar session en null, index.tsx vuelve a mostrar el AuthPanel */
	};

	const abrirFormulario = () => {
		setMarcaMapa(null);
		setMarcandoEnMapa(false);
		setFormKey((k) => k + 1);
		setFormAbierto(true);
	};

	const cerrarFormulario = () => {
		setFormAbierto(false);
		setMarcandoEnMapa(false);
	};

	/* El formulario pide el punto: se sale al mapa y se espera el long-press */
	const irAMarcarEnMapa = () => {
		setFormAbierto(false);
		setMarcandoEnMapa(true);
	};

	const cancelarMarcado = () => {
		setMarcandoEnMapa(false);
		setFormAbierto(true);
	};

	const handleLongPress = (evento: LongPressEvent) => {
		if (!marcandoEnMapa) return;
		setMarcaMapa(evento.nativeEvent.coordinate);
		setMarcandoEnMapa(false);
		setFormAbierto(true);
	};

	const handleReportado = () => {
		cerrarFormulario();
		setConfirmacion("Avistamiento reportado");

		/*
		 * El formulario ya esperó a que el insert terminara antes de avisar, así que
		 * la fila está confirmada y este refetch la trae. Sin await: el cartel y el
		 * cierre no tienen por qué esperar a la red, el pin aparece cuando llega.
		 */
		refetch();
	};

	/* La confirmación es un cartelito que se va solo */
	useEffect(() => {
		if (!confirmacion) return;
		const id = setTimeout(() => setConfirmacion(null), 2600);
		return () => clearTimeout(id);
	}, [confirmacion]);

	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
			}}
		>
			<View style={{ width: "100%", height: "100%" }}>
				<MapView
					ref={mapRef}
					provider={PROVIDER_GOOGLE}
					customMapStyle={mapStyleDark}
					style={{ flex: 1 }}
					onLongPress={handleLongPress}
					showsUserLocation={true}
					initialRegion={{
						latitude: -34.6037,
						longitude: -58.3816,
						latitudeDelta: 0.05,
						longitudeDelta: 0.05,
					}}
				>
					{visibles.map((s) => (
						<PinAvistamiento
							key={s.id}
							color={s.estado === "confirmed" ? "verde" : "rojo"}
							coordinate={{ latitude: s.latitude, longitude: s.longitude }}
							title={s.description ?? "Avistamiento"}
							description={
								s.estado === "confirmed" ? "Confirmado" : "Sin confirmar"
							}
						/>
					))}
				</MapView>
			</View>

			{/* Columna de filtros, apoyada sobre el borde izquierdo del marco */}
			<View className="absolute left-[-8]" style={{ top: "18%", gap: 6 }}>
				<BotonFiltro
					fuente={filtros.confirmado}
					activo={filtroEstado === "confirmed"}
					etiqueta="Ver solo avistamientos confirmados"
					onPress={() => alternarEstado("confirmed")}
				/>
				<BotonFiltro
					fuente={filtros.pendiente}
					activo={filtroEstado === "pending"}
					etiqueta="Ver solo avistamientos sin confirmar"
					onPress={() => alternarEstado("pending")}
				/>
			</View>

			{confirmacion ? (
				<View
					className="absolute inset-x-4 top-4 items-center border-2 py-2"
					style={{ backgroundColor: DEEP, borderColor: INK }}
				>
					<Text style={{ fontFamily: MONO, fontSize: 13, color: GO }}>
						{confirmacion}
					</Text>
				</View>
			) : null}

			{marcandoEnMapa ? (
				/* Modo marcado: el botón deja lugar a la instrucción */
				<View
					className="absolute inset-x-2 bottom-2 items-center border-2 px-3 py-3"
					style={{ backgroundColor: DEEP, borderColor: INK }}
				>
					<Text
						style={{
							fontFamily: MONO,
							fontSize: 12,
							letterSpacing: 1,
							color: SKY,
							textAlign: "center",
						}}
					>
						MANTENÉ PRESIONADO DONDE LO VISTE
					</Text>
					<Pressable
						onPress={cancelarMarcado}
						accessibilityRole="button"
						hitSlop={8}
						style={{ marginTop: 6 }}
					>
						<Text
							style={{
								fontFamily: MONO,
								fontSize: 12,
								color: DIM,
								textDecorationLine: "underline",
							}}
						>
							volver al formulario
						</Text>
					</Pressable>
				</View>
			) : (
				/* Fila de acciones: reportar a la izquierda, filtro de cercanos a la derecha */
				<View className="absolute inset-x-2 bottom-0 flex-row items-end justify-between">
					<TouchableOpacity onPress={abrirFormulario}>
						<ImageBackground
							source={require("../assets/images/boton-bg.png")}
							contentFit="fill"
							style={{
								width: 170,
								height: 60,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<Text className="text-white font-bold text-[12px]">
								{textos[idioma].reportar}
							</Text>
						</ImageBackground>
					</TouchableOpacity>

					{/* El contador deja ver cuántos hay cerca sin tener que prender el filtro */}
					<TouchableOpacity
						onPress={alternarCercanos}
						disabled={!ubicacion}
						accessibilityRole="button"
						accessibilityState={{
							disabled: !ubicacion,
							selected: soloCercanos,
						}}
						style={{ opacity: ubicacion ? 1 : 0.45 }}
					>
						<ImageBackground
							source={require("../assets/images/boton-bg.png")}
							contentFit="fill"
							style={{
								width: 160,
								height: 60,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<Text
								className="font-bold text-[12px]"
								style={{ color: soloCercanos ? GO : "#fff" }}
							>
								{ubicacion
									? `${textos[idioma].cercanos} (${cercanos.length})`
									: textos[idioma].cercanos}
							</Text>
						</ImageBackground>
					</TouchableOpacity>
				</View>
			)}

			{error ? (
				<Text
					style={{
						fontFamily: MONO,
						fontSize: 13,
						color: ALERT,
						marginTop: 14,
						textAlign: "center",
						paddingHorizontal: 24,
					}}
				>
					{error}
				</Text>
			) : null}

			{/* Último en el árbol: su velo tapa el mapa y el botón de reportar */}
			<MenuHamburguesa
				onCerrarSesion={handleSignOut}
				cerrandoSesion={signingOut}
				errorSesion={error}
				avistamientos={sightings}
				onVerEnMapa={verEnMapa}
			/>

			<SightingForm
				key={formKey}
				visible={formAbierto}
				mapPick={marcaMapa}
				onClose={cerrarFormulario}
				onRequestMapPick={irAMarcarEnMapa}
				onReported={handleReportado}
			/>
		</View>
	);
}

type BotonFiltroProps = {
	fuente: number;
	activo: boolean;
	etiqueta: string;
	onPress: () => void;
};

/* Apagado se ve atenuado, encendido a pleno: el propio arte indica qué filtra */
function BotonFiltro({ fuente, activo, etiqueta, onPress }: BotonFiltroProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={etiqueta}
			accessibilityState={{ selected: activo }}
			style={{ opacity: activo ? 1 : 0.5 }}
		>
			<Image
				source={fuente}
				contentFit="contain"
				style={{ width: FILTRO_W, height: FILTRO_H }}
			/>
		</TouchableOpacity>
	);
}
