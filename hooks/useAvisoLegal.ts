import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/*
 * Versionada a propósito: si el texto del aviso cambia de fondo, se sube a v2 y
 * el cartel vuelve a aparecer una vez para todos.
 */
const CLAVE = "aviso-legal-v1";

export function useAvisoLegal() {
	/* null mientras lee el storage: así el cartel no parpadea en el arranque */
	const [pendiente, setPendiente] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelado = false;

		(async () => {
			try {
				const visto = await AsyncStorage.getItem(CLAVE);
				if (!cancelado) setPendiente(visto === null);
			} catch {
				/* Si no se puede leer, se muestra: es el lado seguro para un aviso legal */
				if (!cancelado) setPendiente(true);
			}
		})();

		return () => {
			cancelado = true;
		};
	}, []);

	const aceptar = useCallback(async () => {
		/*
		 * Se cierra primero y se guarda después: si la escritura falla, el usuario
		 * sigue de largo igual y el aviso reaparece en el próximo arranque.
		 */
		setPendiente(false);
		try {
			await AsyncStorage.setItem(CLAVE, "1");
		} catch {}
	}, []);

	return { pendiente, aceptar };
}
