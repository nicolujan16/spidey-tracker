import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	Easing,
	Keyboard,
	Modal,
	PanResponder,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export type Coords = { latitude: number; longitude: number };

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const MAX_DESC = 200;
const MAX_ATRAS = 24 * 60; // la ventana de 24 h, contada en minutos

const ALTO_PANTALLA = Dimensions.get("window").height;
/* Pasada esta fracción de la hoja, soltar la cierra en vez de devolverla arriba */
const FRACCION_CIERRE = 0.3;
/* ...o con un envión rápido hacia abajo, aunque no hayas bajado tanto */
const VELOCIDAD_CIERRE = 1.2;
/* La hoja no se apoya en el piso: el mb-14 la deja 56px (14 * 4) más arriba */
const MARGEN_ABAJO = 56;

type Origen = "actual" | "mapa";
type Momento = "recien" | "antes";

type Props = {
	visible: boolean;
	/* Coordenada que dejó el long-press en el mapa, si el usuario fue a marcarla */
	mapPick: Coords | null;
	onClose: () => void;
	onRequestMapPick: () => void;
	onReported: () => void;
};

/* "hace 2 h 15 min" */
function formatearHace(minutos: number) {
	if (minutos === 0) return "ahora mismo";
	const h = Math.floor(minutos / 60);
	const m = minutos % 60;
	if (h === 0) return `hace ${m} min`;
	if (m === 0) return `hace ${h} h`;
	return `hace ${h} h ${m} min`;
}

/* Como el tope es 24 h atrás, la fecha solo puede caer hoy o ayer */
function formatearReloj(fecha: Date) {
	const hoy = new Date().toDateString() === fecha.toDateString();
	const hh = String(fecha.getHours()).padStart(2, "0");
	const mm = String(fecha.getMinutes()).padStart(2, "0");
	return `${hoy ? "hoy" : "ayer"} ${hh}:${mm}`;
}

/*
 * El formulario queda montado aunque el modal esté oculto: cuando el usuario va a
 * marcar el punto en el mapa el modal se cierra, y al volver tiene que reencontrar
 * la descripción y el horario que ya había cargado.
 */
export default function SightingForm({
	visible,
	mapPick,
	onClose,
	onRequestMapPick,
	onReported,
}: Props) {
	const { session } = useAuth();

	const [origen, setOrigen] = useState<Origen>("actual");
	const [coordsActuales, setCoordsActuales] = useState<Coords | null>(null);
	const [ubicando, setUbicando] = useState(false);
	const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
	const [intentoGps, setIntentoGps] = useState(0);

	const [momento, setMomento] = useState<Momento>("recien");
	const [minutosAtras, setMinutosAtras] = useState(30);

	const [descripcion, setDescripcion] = useState("");

	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const coords = origen === "actual" ? coordsActuales : mapPick;

	/*
	 * La hoja se anima a mano en vez de con animationType="slide" del Modal, porque el
	 * gesto tiene que poder tomar esa misma posición a mitad de camino y decidir si la
	 * devuelve arriba o la termina de tirar abajo.
	 */
	const desplazamiento = useRef(new Animated.Value(ALTO_PANTALLA)).current;
	const [altoHoja, setAltoHoja] = useState(ALTO_PANTALLA);

	/*
	 * Con statusBarTranslucent el Modal se dibuja en su propia ventana y el
	 * adjustResize de Android no llega hasta ahí: al abrirse el teclado no se movía
	 * nada y la hoja quedaba tapada. KeyboardAvoidingView tampoco alcanzaba, porque
	 * en Android su behavior no hace nada dentro del modal. Así que se mide el
	 * teclado a mano y ese hueco se le suma al fondo del contenedor.
	 */
	const espacioTeclado = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const iOS = Platform.OS === "ios";

		const mover = (destino: number, duracion: number) =>
			Animated.timing(espacioTeclado, {
				toValue: destino,
				duration: duracion,
				easing: Easing.out(Easing.cubic),
				/* paddingBottom no lo puede animar el hilo nativo */
				useNativeDriver: false,
			}).start();

		/* iOS avisa antes de animar; Android recién cuando el teclado ya subió */
		const sube = Keyboard.addListener(
			iOS ? "keyboardWillShow" : "keyboardDidShow",
			(e) =>
				mover(
					/* La hoja ya está MARGEN_ABAJO arriba: solo falta cubrir el resto */
					Math.max(0, e.endCoordinates.height - MARGEN_ABAJO),
					e.duration || 220,
				),
		);
		const baja = Keyboard.addListener(
			iOS ? "keyboardWillHide" : "keyboardDidHide",
			(e) => mover(0, e.duration || 180),
		);

		return () => {
			sube.remove();
			baja.remove();
		};
	}, [espacioTeclado]);

	/* El PanResponder se arma una sola vez, así que lo mutable lo lee de este ref */
	const vivo = useRef({
		alto: ALTO_PANTALLA,
		enviando: false,
		cerrar: () => {},
	});

	const volverArriba = useCallback(() => {
		Animated.spring(desplazamiento, {
			toValue: 0,
			useNativeDriver: true,
			damping: 24,
			stiffness: 260,
			mass: 0.9,
		}).start();
	}, [desplazamiento]);

	/* Baja la hoja hasta salir de pantalla y recién ahí avisa hacia afuera */
	const salir = useCallback(
		(alTerminar: () => void) => {
			Animated.timing(desplazamiento, {
				toValue: vivo.current.alto,
				duration: 220,
				easing: Easing.in(Easing.cubic),
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) alTerminar();
			});
		},
		[desplazamiento],
	);

	const cerrarAnimado = () => {
		if (enviando) return;
		salir(onClose);
	};

	/* Cada vez que se abre, entra desde abajo */
	useEffect(() => {
		if (visible) volverArriba();
	}, [visible, volverArriba]);

	/* El responder quedó congelado en el primer render: acá se le refresca lo que cambia */
	useEffect(() => {
		vivo.current.enviando = enviando;
		vivo.current.cerrar = () => salir(onClose);
	});

	const arrastre = useMemo(
		() =>
			PanResponder.create({
				/*
				 * Es un asa dedicada: no hay nada más que apretar en esta franja, así que
				 * reclama el toque desde que se apoya el dedo en vez de esperar a juntar
				 * movimiento. Esperar dejaba el gesto sin dueño en el arranque.
				 */
				onStartShouldSetPanResponder: () => !vivo.current.enviando,
				onMoveShouldSetPanResponder: () => !vivo.current.enviando,
				/* Y lo gana en la fase de captura, antes que cualquier hijo */
				onMoveShouldSetPanResponderCapture: (_, g) =>
					!vivo.current.enviando &&
					Math.abs(g.dy) > 2 &&
					Math.abs(g.dy) > Math.abs(g.dx),
				onPanResponderMove: (_, g) => {
					/* Sigue al dedo, pero la hoja no despega por encima de su lugar */
					if (g.dy > 0) desplazamiento.setValue(g.dy);
				},
				onPanResponderRelease: (_, g) => {
					const { alto, cerrar } = vivo.current;
					if (g.dy > alto * FRACCION_CIERRE || g.vy > VELOCIDAD_CIERRE)
						cerrar();
					else volverArriba();
				},
				/* Una vez agarrada, no se la suelta hasta que el dedo se va */
				onPanResponderTerminationRequest: () => false,
				/* Si aun así el sistema se lo lleva, la hoja vuelve a su lugar */
				onPanResponderTerminate: () => volverArriba(),
			}),
		[desplazamiento, volverArriba],
	);

	const medirHoja = (e: LayoutChangeEvent) => {
		const alto = e.nativeEvent.layout.height;
		/* Un alto 0 dejaría el interpolate del telón con inputRange [0, 0] */
		if (alto <= 0) return;
		vivo.current.alto = alto;
		setAltoHoja(alto);
	};

	/* El telón se aclara a medida que la hoja baja */
	const opacidadTelon = desplazamiento.interpolate({
		inputRange: [0, altoHoja],
		outputRange: [0.72, 0],
		extrapolate: "clamp",
	});

	/* Pide el GPS solo cuando hace falta; con coordenadas en mano no vuelve a molestar */
	useEffect(() => {
		if (!visible || origen !== "actual" || coordsActuales) return;

		let cancelado = false;
		setUbicando(true);
		setErrorUbicacion(null);

		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (cancelado) return;

				if (status !== "granted") {
					setErrorUbicacion("sin permiso de ubicación");
					return;
				}

				const posicion = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});
				if (cancelado) return;

				setCoordsActuales({
					latitude: posicion.coords.latitude,
					longitude: posicion.coords.longitude,
				});
			} catch {
				if (!cancelado) setErrorUbicacion("no pudimos leer tu ubicación");
			} finally {
				if (!cancelado) setUbicando(false);
			}
		})();

		return () => {
			cancelado = true;
		};
	}, [visible, origen, coordsActuales, intentoGps]);

	/* El mapa devolvió una marca: el formulario se pasa solo a esa opción */
	useEffect(() => {
		if (mapPick) setOrigen("mapa");
	}, [mapPick]);

	const elegirActual = () => {
		setOrigen("actual");
		if (!coordsActuales) setIntentoGps((n) => n + 1);
	};

	const elegirMapa = () => {
		setOrigen("mapa");
		/* Sale con la misma animación: el mapa queda libre para el long-press */
		salir(onRequestMapPick);
	};

	const ajustarMinutos = (delta: number) =>
		setMinutosAtras((m) => Math.min(MAX_ATRAS, Math.max(0, m + delta)));

	const reportar = async () => {
		if (enviando || !coords) return;

		const userId = session?.user?.id;
		if (!userId) {
			setError("Tu sesión expiró. Volvé a entrar.");
			return;
		}

		setError(null);
		setEnviando(true);

		/*
		 * El timestamp se arma recién acá: así "recién" es el instante real del envío
		 * y "hace un rato" no se escapa de la ventana de 24 h por haber dejado el
		 * modal abierto un rato largo.
		 */
		const sightedAt = new Date(
			Date.now() - (momento === "recien" ? 0 : minutosAtras * 60_000),
		);
		const texto = descripcion.trim();

		/* Sin "estado": la fila nace en 'pending' y el trigger la confirma */
		const { error: insertError } = await supabase.from("sightings").insert({
			user_id: userId,
			latitude: coords.latitude,
			longitude: coords.longitude,
			sighted_at: sightedAt.toISOString(),
			description: texto.length > 0 ? texto : null,
		});

		setEnviando(false);

		if (insertError) {
			setError(insertError.message);
			return;
		}

		salir(onReported);
	};

	let estadoUbicacion: string;
	if (origen === "actual" && ubicando) estadoUbicacion = "buscando señal...";
	else if (origen === "actual" && errorUbicacion)
		estadoUbicacion = errorUbicacion;
	else if (coords)
		estadoUbicacion = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
	else estadoUbicacion = "mantené presionado el mapa para marcar";

	const piso = minutosAtras <= 0;
	const tope = minutosAtras >= MAX_ATRAS;

	return (
		<Modal
			visible={visible}
			/* La entrada y la salida las maneja el gesto, no el Modal */
			animationType="none"
			transparent
			presentationStyle="overFullScreen"
			statusBarTranslucent
			onRequestClose={enviando ? undefined : cerrarAnimado}
		>
			{/* El padding de abajo es el hueco del teclado: empuja la hoja hacia arriba */}
			<Animated.View
				className="flex-1"
				style={{ paddingBottom: espacioTeclado }}
			>
				<View className="flex-1 justify-end mb-14">
					{/* Telón: se oscurece y se aclara siguiendo a la hoja */}
					<Animated.View
						pointerEvents="none"
						style={[
							StyleSheet.absoluteFill,
							{ backgroundColor: "#000", opacity: opacidadTelon },
						]}
					/>

					{/* Tocar por encima de la hoja también cierra */}
					<Pressable
						className="flex-1"
						onPress={cerrarAnimado}
						disabled={enviando}
						accessibilityRole="button"
						accessibilityLabel="Cerrar formulario"
					/>

					<Animated.View
						onLayout={medirHoja}
						style={{ transform: [{ translateY: desplazamiento }] }}
						className="border-2 border-b-0 border-[#1e1e14] bg-[#0e1c3b] px-5 pb-6 pt-4"
					>
						{/*
						 * Franja superior arrastrable. Los márgenes negativos le hacen comer
						 * el padding del panel para que el asa llegue hasta el borde de
						 * arriba: con solo -mx-5, los 16px del pt-4 quedaban fuera de la zona
						 * y agarrar justo "el borde superior" no tomaba nada.
						 */}
						<View
							{...arrastre.panHandlers}
							className="-mx-5 -mt-4 px-5 pb-3 pt-4"
						>
							<View className="h-1.5 w-14 self-center bg-[#154f80]" />

							<Text
								style={{ fontFamily: MONO }}
								className="mt-4 text-[13px] tracking-[1.5px] text-[#96e0f7]"
							>
								{"> NUEVO AVISTAMIENTO"}
							</Text>
						</View>

						{/* ---------- Ubicación ---------- */}
						<Text
							style={{ fontFamily: MONO }}
							className="mt-4 text-[11px] tracking-[1.5px] text-[#4d7a91]"
						>
							¿DÓNDE LO VISTE?
						</Text>
						<View className="mt-2 flex-row gap-2">
							<Opcion
								label="ACÁ MISMO"
								activa={origen === "actual"}
								disabled={enviando}
								onPress={elegirActual}
							/>
							<Opcion
								label="MARCAR EN EL MAPA"
								activa={origen === "mapa"}
								disabled={enviando}
								onPress={elegirMapa}
							/>
						</View>

						<View className="mt-2 flex-row items-center gap-2">
							<View
								className={`h-2.5 w-2.5 border border-[#1e1e14] ${
									coords ? "bg-[#52b375]" : "bg-[#0a1420]"
								}`}
							/>
							<Text
								style={{ fontFamily: MONO }}
								className={`flex-1 text-[12px] ${
									origen === "actual" && errorUbicacion
										? "text-[#ec5147]"
										: "text-[#4d7a91]"
								}`}
								numberOfLines={1}
							>
								{estadoUbicacion}
							</Text>
							{origen === "actual" && errorUbicacion && !enviando ? (
								<Pressable
									onPress={() => setIntentoGps((n) => n + 1)}
									accessibilityRole="button"
									hitSlop={8}
								>
									<Text
										style={{ fontFamily: MONO }}
										className="text-[12px] text-[#96e0f7] underline"
									>
										reintentar
									</Text>
								</Pressable>
							) : null}
						</View>

						{/* ---------- Momento ---------- */}
						<Text
							style={{ fontFamily: MONO }}
							className="mt-4 text-[11px] tracking-[1.5px] text-[#4d7a91]"
						>
							¿CUÁNDO LO VISTE?
						</Text>
						<View className="mt-2 flex-row gap-2">
							<Opcion
								label="RECIÉN"
								activa={momento === "recien"}
								disabled={enviando}
								onPress={() => setMomento("recien")}
							/>
							<Opcion
								label="HACE UN RATO"
								activa={momento === "antes"}
								disabled={enviando}
								onPress={() => setMomento("antes")}
							/>
						</View>

						{momento === "antes" ? (
							/* Acotado a [0, 24 h]: no hay forma de elegir un futuro ni de
							   pasarse para atrás de la ventana */
							<View className="mt-3 flex-row items-center gap-2">
								<Paso
									label="-1 h"
									disabled={enviando || piso}
									onPress={() => ajustarMinutos(-60)}
								/>
								<Paso
									label="-15"
									disabled={enviando || piso}
									onPress={() => ajustarMinutos(-15)}
								/>
								<View className="flex-1 items-center">
									<Text
										style={{ fontFamily: MONO }}
										className="text-[13px] text-[#eaeadc]"
									>
										{formatearHace(minutosAtras)}
									</Text>
									<Text
										style={{ fontFamily: MONO }}
										className="text-[11px] text-[#4d7a91]"
									>
										{formatearReloj(
											new Date(Date.now() - minutosAtras * 60_000),
										)}
									</Text>
								</View>
								<Paso
									label="+15"
									disabled={enviando || tope}
									onPress={() => ajustarMinutos(15)}
								/>
								<Paso
									label="+1 h"
									disabled={enviando || tope}
									onPress={() => ajustarMinutos(60)}
								/>
							</View>
						) : (
							<Text
								style={{ fontFamily: MONO }}
								className="mt-2 text-[12px] text-[#4d7a91]"
							>
								se guarda con la hora exacta del envío
							</Text>
						)}

						{/* ---------- Descripción ---------- */}
						<Text
							style={{ fontFamily: MONO }}
							className="mt-4 text-[11px] tracking-[1.5px] text-[#4d7a91]"
						>
							¿QUÉ ESTABA HACIENDO? (OPCIONAL)
						</Text>
						<TextInput
							value={descripcion}
							onChangeText={setDescripcion}
							editable={!enviando}
							multiline
							maxLength={MAX_DESC}
							textAlignVertical="top"
							placeholder="Colgado de un edificio, persiguiendo a alguien..."
							placeholderTextColor="#4d7a91"
							selectionColor="#96e0f7"
							style={{ fontFamily: MONO }}
							className="mt-2 h-[68px] border-2 border-[#1e1e14] bg-[#2c2c2c] px-3 py-2 text-[14px] text-[#96e0f7]"
						/>
						<Text
							style={{ fontFamily: MONO }}
							className={`mt-1 self-end text-[11px] ${
								descripcion.length >= MAX_DESC
									? "text-[#ec5147]"
									: "text-[#4d7a91]"
							}`}
						>
							{descripcion.length}/{MAX_DESC}
						</Text>

						{error ? (
							<Text
								style={{ fontFamily: MONO }}
								className="mt-2 text-[12px] leading-[17px] text-[#ec5147]"
							>
								{error}
							</Text>
						) : null}

						{/* ---------- Acciones ---------- */}
						<View className="mt-4 flex-row gap-2">
							<Boton
								label="CANCELAR"
								fondo="#154f80"
								texto="#eaeadc"
								onPress={cerrarAnimado}
								disabled={enviando}
							/>
							<Boton
								label="REPORTAR"
								fondo="#ec5147"
								texto="#eaeadc"
								onPress={reportar}
								disabled={!coords || enviando}
								cargando={enviando}
								ancho={1.6}
							/>
						</View>
					</Animated.View>
				</View>
			</Animated.View>
		</Modal>
	);
}

/* Tecla de opción, del mismo molde que el selector de modo del AuthPanel */
function Opcion({
	label,
	activa,
	disabled,
	onPress,
}: {
	label: string;
	activa: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);
	const hundida = pressed || activa;

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			disabled={disabled}
			accessibilityRole="radio"
			accessibilityState={{ selected: activa, disabled }}
			className={`flex-1 items-center justify-center border-2 border-[#1e1e14] px-1 py-3 ${
				activa ? "bg-[#154f80]" : "bg-[#0a1420]"
			}`}
			style={{
				borderBottomWidth: hundida ? 2 : 5,
				marginTop: hundida ? 3 : 0,
				opacity: disabled ? 0.5 : 1,
			}}
		>
			<Text
				style={{ fontFamily: MONO }}
				className={`text-[11px] tracking-[1px] ${
					activa ? "text-[#eaeadc]" : "text-[#4d7a91]"
				}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/* Paso del selector de hora */
function Paso({
	label,
	disabled,
	onPress,
}: {
	label: string;
	disabled?: boolean;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			disabled={disabled}
			accessibilityRole="button"
			className="items-center justify-center border-2 border-[#1e1e14] bg-[#154f80] px-2 py-2"
			style={{
				borderBottomWidth: pressed ? 2 : 4,
				marginTop: pressed ? 2 : 0,
				opacity: disabled ? 0.4 : 1,
			}}
		>
			<Text style={{ fontFamily: MONO }} className="text-[12px] text-[#eaeadc]">
				{label}
			</Text>
		</Pressable>
	);
}

/* Botón con el bisel de pixel-art del resto de la app */
function Boton({
	label,
	fondo,
	texto,
	onPress,
	disabled,
	cargando,
	ancho = 1,
}: {
	label: string;
	fondo: string;
	texto: string;
	onPress: () => void;
	disabled?: boolean;
	cargando?: boolean;
	ancho?: number;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ disabled, busy: cargando }}
			className="flex-row items-center justify-center gap-2 border-2 border-[#1e1e14] py-4"
			style={{
				flex: ancho,
				backgroundColor: fondo,
				opacity: disabled ? 0.5 : 1,
				borderBottomWidth: pressed ? 2 : 6,
				marginTop: pressed ? 4 : 0,
			}}
		>
			{cargando ? <ActivityIndicator color={texto} /> : null}
			<Text
				style={{ fontFamily: MONO, color: texto }}
				className="text-[14px] tracking-[1.5px]"
			>
				{label}
			</Text>
		</Pressable>
	);
}
