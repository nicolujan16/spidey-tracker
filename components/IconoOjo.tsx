import Svg, { Circle, Path } from "react-native-svg";

/*
 * Trazo grueso y sin relleno, para que se lea igual que el contorno de los sprites.
 * Con la barra cruzada = la contraseña está tapada; el ojo limpio = se está viendo.
 */
export default function IconoOjo({
	abierto,
	color,
	lado = 22,
}: {
	abierto: boolean;
	color: string;
	lado?: number;
}) {
	return (
		<Svg width={lado} height={lado} viewBox="0 0 24 24">
			<Path
				d="M2 12C4.8 7 8.2 4.8 12 4.8S19.2 7 22 12c-2.8 5-6.2 7.2-10 7.2S4.8 17 2 12z"
				stroke={color}
				strokeWidth={2}
				strokeLinejoin="round"
				fill="none"
			/>
			<Circle
				cx={12}
				cy={12}
				r={3.2}
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			{abierto ? null : (
				<Path
					d="M4 20L20 4"
					stroke={color}
					strokeWidth={2}
					strokeLinecap="round"
				/>
			)}
		</Svg>
	);
}
