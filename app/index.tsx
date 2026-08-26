import { View } from "react-native";
import AuthPanel from "../components/AuthPanel";
import MainPage from "../components/MainPage";
import TrackerFrame from "../components/TrackerFrame";
import { useAuth } from "../context/AuthContext";

export default function Index() {
	const { session, loading } = useAuth();

	/*
	 * El marco se dibuja siempre, incluso mientras resuelve la sesión, así no hay
	 * parpadeo negro al arrancar. Solo cambia lo que va en el hueco del mapa.
	 *
	 * Este condicional hace también de guard: session viene del contexto, así que si
	 * el token expira o la sesión se invalida desde afuera, vuelve solo el AuthPanel.
	 */
	return (
		<TrackerFrame>
			{loading ? (
				<View style={{ flex: 1 }} />
			) : session ? (
				<MainPage />
			) : (
				<AuthPanel />
			)}
		</TrackerFrame>
	);
}
