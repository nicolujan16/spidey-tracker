import { useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const DEEP = "#0e1c3b";
const STEEL = "#154f80";
const SKY = "#96e0f7";
const BONE = "#eaeadc";
const DIM = "#4d7a91";

const PARRAFOS = [
	"Spidey-Tracker es un proyecto personal de demostración, sin fines de lucro, hecho para mostrar cómo se construye una app móvil con React Native y Supabase.",
	"No es una aplicación oficial: no está afiliada, patrocinada ni aprobada por Sony Pictures, Marvel ni Disney.",
	"Spider-Man, su nombre y su imagen son marcas y propiedad de Marvel Characters, Inc. Las películas son propiedad de Sony Pictures Entertainment Inc. Todos los derechos pertenecen a sus respectivos titulares y acá se usan solo como referencia temática, con fines educativos.",
	"El arte y los sprites pertenecen a sus autores y se usan sin fines comerciales.",
];

/* Va aparte: cierra el aviso recordando que lo del mapa tampoco es real */
const CIERRE =
	"Los avistamientos que aparecen en el mapa son ficticios y los cargan los usuarios de la demo. Nada de lo que ves acá es real.";

type Props = {
	visible: boolean;
	onClose: () => void;
	/* Relectura desde Configuración: se puede cerrar con el back y no guarda nada */
	soloLectura?: boolean;
};

/*
 * Se monta en el layout raíz, así aparece igual con sesión o sin ella, por encima
 * del marco. En el arranque hay que reconocerlo con el botón: el back de Android no
 * lo esquiva.
 */
export default function AvisoLegal({ visible, onClose, soloLectura }: Props) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={soloLectura ? onClose : undefined}
		>
			<View
				className="flex-1 justify-center px-6 py-10"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.82)" }}
			>
				<View
					className="border-2 px-5 py-5"
					style={{ backgroundColor: DEEP, borderColor: INK, maxHeight: "100%" }}
				>
					<Text
						style={{ fontFamily: MONO, color: SKY }}
						className="text-[13px] tracking-[1.5px]"
					>
						{"> AVISO"}
					</Text>

					{/* El texto completo no entra sin scroll en pantallas chicas */}
					<ScrollView
						className="mt-4"
						contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
						showsVerticalScrollIndicator
						persistentScrollbar
						indicatorStyle="white"
					>
						{PARRAFOS.map((parrafo) => (
							<Text
								key={parrafo}
								style={{ fontFamily: MONO, color: BONE }}
								className="text-[13px] leading-[20px]"
							>
								{parrafo}
							</Text>
						))}

						<Text
							style={{ fontFamily: MONO, color: DIM }}
							className="text-[13px] leading-[20px]"
						>
							{CIERRE}
						</Text>
					</ScrollView>

					<View className="mt-5">
						<BotonPixel
							label={soloLectura ? "CERRAR" : "ENTENDIDO"}
							onPress={onClose}
						/>
					</View>
				</View>
			</View>
		</Modal>
	);
}

/* El mismo bisel de pixel-art que el resto de los botones de la app */
function BotonPixel({ label, onPress }: { label: string; onPress: () => void }) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			accessibilityRole="button"
			className="items-center justify-center border-2 py-4"
			style={{
				backgroundColor: STEEL,
				borderColor: INK,
				borderBottomWidth: pressed ? 2 : 6,
				marginTop: pressed ? 4 : 0,
			}}
		>
			<Text
				style={{ fontFamily: MONO, color: BONE }}
				className="text-[14px] tracking-[1.5px]"
			>
				{label}
			</Text>
		</Pressable>
	);
}
