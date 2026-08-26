import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const STEEL = "#154f80";
const SKY = "#96e0f7";
const BONE = "#eaeadc";
const DIM = "#4d7a91";

/* Barra de arriba de los paneles del menú: título, línea de contexto y salida */
export default function PanelCabecera({
	titulo,
	detalle,
	onClose,
}: {
	titulo: string;
	detalle: string;
	onClose: () => void;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<View
			className="flex-row items-center gap-3 border-b-2 px-4 py-3"
			style={{ borderColor: INK }}
		>
			<View className="flex-1">
				<Text
					style={{ fontFamily: MONO, color: SKY }}
					className="text-[12px] tracking-[1.5px]"
				>
					{`> ${titulo}`}
				</Text>
				<Text
					style={{ fontFamily: MONO, color: DIM }}
					className="mt-1 text-[11px]"
					numberOfLines={1}
				>
					{detalle}
				</Text>
			</View>

			<Pressable
				onPress={onClose}
				onPressIn={() => setPressed(true)}
				onPressOut={() => setPressed(false)}
				accessibilityRole="button"
				accessibilityLabel="Cerrar panel"
				className="items-center justify-center border-2 px-4 py-2"
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
					VOLVER
				</Text>
			</Pressable>
		</View>
	);
}
