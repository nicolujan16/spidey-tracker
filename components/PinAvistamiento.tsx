import { useState } from "react";
import { Image } from "react-native";
import type { MapMarkerProps } from "react-native-maps";
import { Marker } from "react-native-maps";

/* El arte nativo es 96x128, o sea 3:4; la caja respeta esa proporción */
const PIN_W = 30;
const PIN_H = 40;

const pines = {
	verde: require("../assets/images/pin-verde.png"),
	rojo: require("../assets/images/pin-rojo.png"),
};

export type ColorPin = keyof typeof pines;

type Props = Omit<MapMarkerProps, "anchor" | "tracksViewChanges"> & {
	color: ColorPin;
};

/*
 * react-native-maps arma el icono rasterizando esta vista a un bitmap. Si se le
 * pasa tracksViewChanges={false} de entrada, la captura ocurre una sola vez y
 * cae antes de que el PNG termine de decodificar: el marker queda registrado
 * (responde al tap, abre el callout) pero con el icono transparente.
 *
 * Por eso el tracking arranca prendido y recién se apaga en el onLoad, que es el
 * camino para el que la librería dejó el updateMarkerIcon() extra al bajar el flag.
 */
export default function PinAvistamiento({ color, ...marker }: Props) {
	const [cargado, setCargado] = useState(false);

	return (
		<Marker
			{...marker}
			/* La punta de la gota es lo que tiene que caer sobre la coordenada */
			anchor={{ x: 0.5, y: 1 }}
			tracksViewChanges={!cargado}
		>
			<Image
				source={pines[color]}
				style={{ width: PIN_W, height: PIN_H }}
				resizeMode="contain"
				onLoad={() => setCargado(true)}
			/>
		</Marker>
	);
}
