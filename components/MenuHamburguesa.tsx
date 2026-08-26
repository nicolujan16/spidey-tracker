import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	BackHandler,
	Image,
	Modal,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import type { Sighting } from "../hooks/useSightings";
import Configuracion from "./Configuracion";
import MisAvistamientos from "./MisAvistamientos";
import UltimosAvistamientos from "./UltimosAvistamientos";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const DEEP = "#0e1c3b";
const STEEL = "#154f80";
const SKY = "#96e0f7";
const BONE = "#eaeadc";
const ALERT = "#ec5147";
const DIM = "#4d7a91";

/* El velo tapa el hueco del mapa al 90%: MainPage se sigue intuyendo detrás */
const VELO = "rgba(14, 28, 59, 0.9)";

const LADO_BOTON = 44;

type Props = {
	onCerrarSesion: () => void;
	cerrandoSesion: boolean;
	/* La lista viva del mapa, que el panel de últimos muestra tal cual */
	avistamientos: Sighting[];
	/* Lleva la cámara del mapa hasta un avistamiento de las listas */
	onVerEnMapa: (avistamiento: Sighting) => void;
	/* El error que haya devuelto signOut, para mostrarlo sin cerrar el diálogo */
	errorSesion?: string | null;
};

/*
 * Vive dentro de MainPage, así que el velo cubre exactamente el hueco del mapa y el
 * marco pixel-art queda a la vista. De paso, MainPage solo se monta con sesión
 * iniciada: "cerrar sesión" no puede aparecer nunca sobre el AuthPanel.
 */
export default function MenuHamburguesa({
	onCerrarSesion,
	cerrandoSesion,
	errorSesion,
	avistamientos,
	onVerEnMapa,
}: Props) {
	const [abierto, setAbierto] = useState(false);
	const [confirmando, setConfirmando] = useState(false);
	const [panel, setPanel] = useState<"mis" | "ultimos" | "config" | null>(
		null,
	);

	/* El mapa está detrás de todo esto: para verlo hay que cerrar panel y menú */
	const verEnMapa = (avistamiento: Sighting) => {
		setPanel(null);
		setAbierto(false);
		onVerEnMapa(avistamiento);
	};

	/*
	 * El botón físico de Android: mientras haya algo abierto cierra eso, en vez de
	 * sacar al usuario de la app. Con el diálogo de salir arriba no se registra,
	 * porque ese back lo atiende el propio Modal.
	 */
	useEffect(() => {
		if (confirmando || (!abierto && !panel)) return;

		const suscripcion = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				if (panel) setPanel(null);
				else setAbierto(false);
				/* true = ya está atendido, que no siga hacia afuera */
				return true;
			},
		);

		return () => suscripcion.remove();
	}, [abierto, panel, confirmando]);

	/*
	 * No cierra el diálogo acá a propósito: si signOut falla hay que poder mostrar el
	 * error, y si sale bien la sesión queda en null e index.tsx desmonta todo esto solo.
	 */
	const confirmarSalida = () => onCerrarSesion();

	return (
		<>
			{abierto ? (
				<View className="absolute inset-0" style={{ backgroundColor: VELO }}>
					{/* Deja libre la esquina donde se apoya el botón */}
					<View style={{ height: LADO_BOTON + 20 }} />

					<View style={{ paddingHorizontal: 16, gap: 10 }}>
						<ItemMenu
							label="MIS AVISTAMIENTOS"
							onPress={() => setPanel("mis")}
						/>
						<ItemMenu
							label="ÚLTIMOS AVISTAMIENTOS"
							onPress={() => setPanel("ultimos")}
						/>
						<ItemMenu
							label="CONFIGURACIÓN"
							onPress={() => setPanel("config")}
						/>
						<ItemMenu
							label="CERRAR SESIÓN"
							fondo={ALERT}
							onPress={() => setConfirmando(true)}
						/>
					</View>

					{/* Tocar el resto del velo cierra el menú */}
					<Pressable
						className="flex-1"
						onPress={() => setAbierto(false)}
						accessibilityRole="button"
						accessibilityLabel="Cerrar menú"
					/>
				</View>
			) : null}

			{/* Va después del velo a propósito: queda por encima y hace de interruptor */}
			<Pressable
				onPress={() => setAbierto((a) => !a)}
				hitSlop={10}
				accessibilityRole="button"
				accessibilityLabel={abierto ? "Cerrar menú" : "Abrir menú"}
				accessibilityState={{ expanded: abierto }}
				style={{ position: "absolute", left: 8, top: 8 }}
			>
				{({ pressed }) => (
					<Image
						source={require("../assets/images/menu-btn.png")}
						resizeMode="contain"
						style={{
							width: LADO_BOTON,
							height: LADO_BOTON,
							opacity: pressed ? 0.75 : 1,
						}}
					/>
				)}
			</Pressable>

			{/* Van después del botón: mientras hay panel, el menú queda tapado */}
			<MisAvistamientos
				visible={panel === "mis"}
				onClose={() => setPanel(null)}
				onVerEnMapa={verEnMapa}
			/>

			<UltimosAvistamientos
				visible={panel === "ultimos"}
				avistamientos={avistamientos}
				onClose={() => setPanel(null)}
				onVerEnMapa={verEnMapa}
			/>

			<Configuracion
				visible={panel === "config"}
				onClose={() => setPanel(null)}
			/>

			<Modal
				visible={confirmando}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={
					cerrandoSesion ? undefined : () => setConfirmando(false)
				}
			>
				<View
					className="flex-1 items-center justify-center px-7"
					style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
				>
					<View
						className="w-full border-2 px-5 py-6"
						style={{ backgroundColor: DEEP, borderColor: INK }}
					>
						<Text
							style={{ fontFamily: MONO, color: SKY }}
							className="text-[12px] tracking-[1.5px]"
						>
							{"> CERRAR SESIÓN"}
						</Text>

						<Text
							style={{ fontFamily: MONO, color: BONE }}
							className="mt-3 text-[16px] leading-[23px]"
						>
							¿Seguro que deseás salir?
						</Text>
						<Text
							style={{ fontFamily: MONO, color: DIM }}
							className="mt-2 text-[12px] leading-[18px]"
						>
							Vas a volver a la pantalla de acceso.
						</Text>

						{errorSesion ? (
							<Text
								style={{ fontFamily: MONO, color: ALERT }}
								className="mt-3 text-[12px] leading-[18px]"
							>
								{errorSesion}
							</Text>
						) : null}

						<View className="mt-5 flex-row gap-2">
							<BotonPixel
								label="CANCELAR"
								fondo={STEEL}
								onPress={() => setConfirmando(false)}
								disabled={cerrandoSesion}
							/>
							<BotonPixel
								label="SALIR"
								fondo={ALERT}
								onPress={confirmarSalida}
								disabled={cerrandoSesion}
								cargando={cerrandoSesion}
								ancho={1.3}
							/>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
}

/* Fila del menú, con el mismo bisel hundido que las teclas del resto de la app */
function ItemMenu({
	label,
	fondo = STEEL,
	onPress,
}: {
	label: string;
	fondo?: string;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			accessibilityRole="button"
			style={{
				backgroundColor: fondo,
				borderWidth: 2,
				borderColor: INK,
				borderBottomWidth: pressed ? 2 : 5,
				marginTop: pressed ? 3 : 0,
				paddingVertical: 14,
				paddingHorizontal: 16,
			}}
		>
			<Text
				style={{
					fontFamily: MONO,
					fontSize: 13,
					letterSpacing: 1.5,
					color: BONE,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}

function BotonPixel({
	label,
	fondo,
	onPress,
	disabled,
	cargando,
	ancho = 1,
}: {
	label: string;
	fondo: string;
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
			className="flex-row items-center justify-center gap-2 border-2 py-4"
			style={{
				flex: ancho,
				backgroundColor: fondo,
				borderColor: INK,
				opacity: disabled ? 0.5 : 1,
				borderBottomWidth: pressed ? 2 : 6,
				marginTop: pressed ? 4 : 0,
			}}
		>
			{cargando ? <ActivityIndicator color={BONE} /> : null}
			<Text
				style={{
					fontFamily: MONO,
					fontSize: 14,
					letterSpacing: 1.5,
					color: BONE,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}
