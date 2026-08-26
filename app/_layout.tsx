import { Stack } from "expo-router";
import AvisoLegal from "../components/AvisoLegal";
import { AuthProvider } from "../context/AuthContext";
import { useAvisoLegal } from "../hooks/useAvisoLegal";
import "../global.css";

export default function RootLayout() {
	/* Se resuelve acá arriba para que el aviso no dependa de si hay sesión o no */
	const { pendiente, aceptar } = useAvisoLegal();

	return (
		<AuthProvider>
			<Stack screenOptions={{ headerShown: false }} />

			{/* Con pendiente en null todavía se está leyendo el storage: no se muestra nada */}
			<AvisoLegal visible={pendiente === true} onClose={aceptar} />
		</AuthProvider>
	);
}
