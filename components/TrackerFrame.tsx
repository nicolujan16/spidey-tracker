import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

/* Los recortes son pixel-art de 79px de lado; SCALE define a qué tamaño se dibujan */
const SCALE = 0.26;
const px = (n: number) => Math.round(n * SCALE);

/* Medidas nativas de los recortes de assets/images/marco */
const SIDE = px(79); // ancho de las columnas 1 y 3
const ROW_1 = px(79); // borde superior
const ROW_3 = px(42); // borde inferior del mapa
const ROW_4 = px(115); // panel del ticker
const ROW_5 = px(16); // sombra inferior

const frame = {
	c11: require("../assets/images/marco/frame1-1.png"),
	c12: require("../assets/images/marco/frame1-2.png"),
	c13: require("../assets/images/marco/frame1-3.png"),
	c21: require("../assets/images/marco/frame2-1.png"),
	c23: require("../assets/images/marco/frame2-3.png"),
	c32: require("../assets/images/marco/frame3-2.png"),
	c33: require("../assets/images/marco/frame3-3.png"),
	c41: require("../assets/images/marco/frame4-1.png"),
	c42: require("../assets/images/marco/frame4-2.png"),
	c43: require("../assets/images/marco/frame4-3.png"),
	c51: require("../assets/images/marco/frame5-1.png"),
	c52: require("../assets/images/marco/frame5-2.png"),
	c53: require("../assets/images/marco/frame5-3.png"),
};

const side = { width: SIDE, height: "100%" } as const;
const mid = { flex: 1, height: "100%" } as const;

/* Logo apoyado sobre el borde superior (nativo 800x134) */
const logo = require("../assets/images/marco/tracker_logo3.png");
const LOGO_W = px(800);
const LOGO_H = px(134);
const LOGO_TOP = ROW_1 - px(10); // pisa un poco la barra de arriba

/* SpiderMan_HeadTurn.png es un sprite sheet: 76 cuadros de 74x119 en una sola fila */
const spidey = require("../assets/images/marco/SpiderMan_HeadTurn.png");
const SPIDEY_FRAMES = 76;
const SPIDEY_SCALE = 0.6;
const SPIDEY_W = Math.round(74 * SPIDEY_SCALE);
const SPIDEY_H = Math.round(119 * SPIDEY_SCALE);
const SPIDEY_FPS = 12;

function SpideyHead() {
	const [frameIndex, setFrameIndex] = useState(0);

	useEffect(() => {
		const id = setInterval(
			() => setFrameIndex((i) => (i + 1) % SPIDEY_FRAMES),
			1000 / SPIDEY_FPS,
		);
		return () => clearInterval(id);
	}, []);

	/* La hoja entera se dibuja estirada y se corre un cuadro a la vez; el View recorta */
	return (
		<View style={{ width: SPIDEY_W, height: SPIDEY_H, overflow: "hidden" }}>
			<Image
				source={spidey}
				resizeMode="stretch"
				style={{
					width: SPIDEY_W * SPIDEY_FRAMES,
					height: SPIDEY_H,
					transform: [{ translateX: -frameIndex * SPIDEY_W }],
				}}
			/>
		</View>
	);
}

/* El marco es el contenedor permanente de la app: los children ocupan el hueco del mapa */
export default function TrackerFrame({ children }: PropsWithChildren) {
	return (
		<View className="flex-1 bg-black px-2 py-20">
			{/* Grilla para el marco */}
			<View className="flex-1">
				{/* Fila 1 - borde superior */}
				<View className="flex-row" style={{ height: ROW_1 }}>
					<Image source={frame.c11} resizeMode="stretch" style={side} />
					<Image source={frame.c12} resizeMode="stretch" style={mid} />
					<Image source={frame.c13} resizeMode="stretch" style={side} />
				</View>

				{/* Fila 2 - laterales, con el hueco del mapa en 2-2 */}
				<View className="flex-1 flex-row">
					<Image source={frame.c21} resizeMode="stretch" style={side} />
					{children}
					<Image source={frame.c23} resizeMode="stretch" style={side} />
				</View>

				{/* Fila 3 - borde inferior del mapa */}
				<View className="flex-row" style={{ height: ROW_3 }}>
					{/* No existe frame3-1.png: el marco es simétrico, así que se usa frame3-3 espejado */}
					<Image
						source={frame.c33}
						resizeMode="stretch"
						style={[side, { transform: [{ scaleX: -1 }] }]}
					/>
					<Image source={frame.c32} resizeMode="stretch" style={mid} />
					<Image source={frame.c33} resizeMode="stretch" style={side} />
				</View>

				{/* Fila 4 - panel del ticker */}
				<View className="flex-row" style={{ height: ROW_4 }}>
					<Image source={frame.c41} resizeMode="stretch" style={side} />
					<Image source={frame.c42} resizeMode="stretch" style={mid} />
					<Image source={frame.c43} resizeMode="stretch" style={side} />
				</View>

				{/* Fila 5 - sombra inferior */}
				<View className="flex-row" style={{ height: ROW_5 }}>
					<Image source={frame.c51} resizeMode="stretch" style={side} />
					<Image source={frame.c52} resizeMode="stretch" style={mid} />
					<Image source={frame.c53} resizeMode="stretch" style={side} />
				</View>

				{/* Logo centrado sobre el borde superior */}
				<View
					className="absolute inset-x-0 items-center"
					style={{ top: LOGO_TOP }}
				>
					<Image
						source={logo}
						resizeMode="stretch"
						style={{ width: LOGO_W, height: LOGO_H }}
					/>
				</View>

				{/* Spidey animado en la esquina inferior izquierda */}
				<View className="absolute left-0" style={{ bottom: ROW_5 }}>
					<SpideyHead />
				</View>
			</View>
		</View>
	);
}
