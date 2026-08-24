import { mapStyleDark } from "@/constants/MapStyle";
import { ImageBackground } from "expo-image";
import { useState } from "react";
import {
	Image,
	Platform,
	Pressable,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../lib/supabase";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const BONE = "#eaeadc";
const SKY = "#96e0f7";
const DIM = "#4d7a91";
const ALERT = "#ec5147";

const textos = {
	es: "Reportar avistamiento",
	en: "Report sighting",
};

/* Pantalla en blanco: acá va el mapa. Ocupa el hueco 2-2 del TrackerFrame. */
export default function MainPage() {
	const [signingOut, setSigningOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [idioma, setIdioma] = useState<"es" | "en">("es"); // Estado para el idioma

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
		// Aquí puedes agregar la lógica para abrir el formulario
		console.log("Formulario abierto");
	};

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
					provider={PROVIDER_GOOGLE}
					showsMyLocationButton={true}
					customMapStyle={mapStyleDark}
					style={{ flex: 1 }}
					initialRegion={{
						latitude: -34.6037,
						longitude: -58.3816,
						latitudeDelta: 0.05,
						longitudeDelta: 0.05,
					}}
				>
					<Marker
						coordinate={{ latitude: -34.6037, longitude: -58.3816 }}
						pinColor={SKY}
						anchor={{ x: 0.5, y: 0.5 }}
						tracksViewChanges={false}
					>
						<Image
							source={require("../assets/images/pin-verde.png")}
							style={{ width: 40, height: 40 }}
							content-fit="contain"
						/>
					</Marker>
				</MapView>
			</View>

			<TouchableOpacity
				onPress={abrirFormulario}
				className="absolute bottom-0 left-0 self-center "
			>
				<ImageBackground
					source={require("../assets/images/boton-bg.png")}
					style={{
						width: 220,
						height: 60,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Text className="text-white font-bold text-base text-[16px]">
						{textos[idioma]}
					</Text>
				</ImageBackground>
			</TouchableOpacity>

			<Pressable
				onPress={handleSignOut}
				disabled={signingOut}
				accessibilityRole="button"
				accessibilityState={{ disabled: signingOut, busy: signingOut }}
				hitSlop={8}
				style={{ marginTop: 16, opacity: signingOut ? 0.5 : 1 }}
			>
				{({ pressed }) => (
					<Text
						style={{
							fontFamily: MONO,
							fontSize: 13,
							color: pressed ? SKY : DIM,
							textDecorationLine: "underline",
						}}
					>
						{signingOut ? "cerrando sesión..." : "cerrar sesión"}
					</Text>
				)}
			</Pressable>

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
		</View>
	);
}
