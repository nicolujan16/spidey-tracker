import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import AvisoLegal from "./AvisoLegal";
import IconoOjo from "./IconoOjo";
import PanelCabecera from "./PanelCabecera";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

const INK = "#1e1e14";
const DEEP = "#0e1c3b";
const FONDO = "#0a1420";
const STEEL = "#154f80";
const READOUT = "#2c2c2c";
const SKY = "#96e0f7";
const BONE = "#eaeadc";
const ALERT = "#ec5147";
const GO = "#52b375";
const DIM = "#4d7a91";
const OFF = "#0a1420";

/* El mínimo que pide Supabase por defecto */
const MIN_PASS = 6;

type Props = {
	visible: boolean;
	onClose: () => void;
};

export default function Configuracion({ visible, onClose }: Props) {
	const { session } = useAuth();
	const email = session?.user?.email;

	const [formAbierto, setFormAbierto] = useState(false);
	const [avisoAbierto, setAvisoAbierto] = useState(false);
	const [actual, setActual] = useState("");
	const [nueva, setNueva] = useState("");
	const [repetida, setRepetida] = useState("");

	const [enviando, setEnviando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [listo, setListo] = useState<string | null>(null);

	/*
	 * El panel no vive en un Modal, pero tampoco se reajusta solo con edge-to-edge:
	 * se mide el teclado y ese hueco se le suma al fondo del scroll, así se llega a
	 * los tres campos con el teclado arriba.
	 */
	const [altoTeclado, setAltoTeclado] = useState(0);

	useEffect(() => {
		const iOS = Platform.OS === "ios";

		const sube = Keyboard.addListener(
			iOS ? "keyboardWillShow" : "keyboardDidShow",
			(e) => setAltoTeclado(e.endCoordinates.height),
		);
		const baja = Keyboard.addListener(
			iOS ? "keyboardWillHide" : "keyboardDidHide",
			() => setAltoTeclado(0),
		);

		return () => {
			sube.remove();
			baja.remove();
		};
	}, []);

	/* Al cerrar no queda nada escrito esperando a la próxima apertura */
	useEffect(() => {
		if (visible) return;

		setFormAbierto(false);
		setAvisoAbierto(false);
		setActual("");
		setNueva("");
		setRepetida("");
		setError(null);
		setListo(null);
	}, [visible]);

	/* El cartel de confirmación se va solo */
	useEffect(() => {
		if (!listo) return;
		const id = setTimeout(() => setListo(null), 3200);
		return () => clearTimeout(id);
	}, [listo]);

	if (!visible) return null;

	const cerrarForm = () => {
		setFormAbierto(false);
		setActual("");
		setNueva("");
		setRepetida("");
		setError(null);
		Keyboard.dismiss();
	};

	const cambiar = async () => {
		if (enviando) return;

		if (!email) {
			setError("Tu sesión expiró. Volvé a entrar.");
			return;
		}
		if (!actual || !nueva || !repetida) {
			setError("Completá los tres campos.");
			return;
		}
		if (nueva.length < MIN_PASS) {
			setError(`La nueva necesita al menos ${MIN_PASS} caracteres.`);
			return;
		}
		if (nueva !== repetida) {
			setError("La nueva y su repetición no coinciden.");
			return;
		}
		if (nueva === actual) {
			setError("La nueva tiene que ser distinta de la actual.");
			return;
		}

		setError(null);
		setEnviando(true);
		Keyboard.dismiss();

		/*
		 * Supabase no expone un "verificar contraseña": la forma de confirmar que quien
		 * está del otro lado sabe la actual es reintentar el login con ella. Si falla, la
		 * sesión que ya había sigue viva, así que no hay riesgo de quedar afuera.
		 */
		const { error: loginError } = await supabase.auth.signInWithPassword({
			email,
			password: actual,
		});

		if (loginError) {
			setEnviando(false);
			setError("La contraseña actual no es correcta.");
			return;
		}

		const { error: updateError } = await supabase.auth.updateUser({
			password: nueva,
		});
		setEnviando(false);

		if (updateError) {
			setError(updateError.message);
			return;
		}

		cerrarForm();
		setListo("Contraseña actualizada");
	};

	return (
		<View className="absolute inset-0 pt-12" style={{ backgroundColor: FONDO }}>
			<PanelCabecera
				titulo="CONFIGURACIÓN"
				detalle={email ?? "sin sesión"}
				onClose={onClose}
			/>

			<ScrollView
				contentContainerStyle={{
					padding: 12,
					paddingBottom: 24 + altoTeclado,
					gap: 12,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{listo ? (
					<View
						className="items-center border-2 py-2"
						style={{ backgroundColor: DEEP, borderColor: INK }}
					>
						<Text
							style={{ fontFamily: MONO, color: GO }}
							className="text-[12px]"
						>
							{listo}
						</Text>
					</View>
				) : null}

				{formAbierto ? (
					<View
						className="border-2 px-4 py-4"
						style={{ backgroundColor: DEEP, borderColor: INK }}
					>
						<Text
							style={{ fontFamily: MONO, color: SKY }}
							className="text-[12px] tracking-[1.5px]"
						>
							{"> CAMBIAR CONTRASEÑA"}
						</Text>

						<View style={{ marginTop: 14, gap: 12 }}>
							<Campo
								label="CONTRASEÑA ACTUAL"
								value={actual}
								onChangeText={setActual}
								editable={!enviando}
								textContentType="password"
								placeholder="la que usás hoy"
							/>
							<Campo
								label="NUEVA"
								value={nueva}
								onChangeText={setNueva}
								editable={!enviando}
								textContentType="newPassword"
								placeholder={`al menos ${MIN_PASS} caracteres`}
							/>
							<Campo
								label="REPETIR NUEVA"
								value={repetida}
								onChangeText={setRepetida}
								editable={!enviando}
								textContentType="newPassword"
								placeholder="otra vez, para confirmar"
							/>
						</View>

						{error ? (
							<Text
								style={{ fontFamily: MONO, color: ALERT }}
								className="mt-3 text-[12px] leading-[18px]"
							>
								{error}
							</Text>
						) : null}

						<View className="mt-4 flex-row gap-2">
							<Boton
								label="CANCELAR"
								fondo={STEEL}
								onPress={cerrarForm}
								disabled={enviando}
							/>
							<Boton
								label="GUARDAR"
								fondo={GO}
								onPress={cambiar}
								disabled={enviando}
								cargando={enviando}
								ancho={1.4}
							/>
						</View>
					</View>
				) : (
					<Boton
						label="CAMBIAR CONTRASEÑA"
						fondo={STEEL}
						onPress={() => setFormAbierto(true)}
					/>
				)}

				{/* El aviso del arranque se acepta una sola vez: acá queda para releerlo */}
				<Boton
					label="VER AVISO LEGAL"
					fondo={STEEL}
					onPress={() => setAvisoAbierto(true)}
				/>
			</ScrollView>

			<AvisoLegal
				visible={avisoAbierto}
				onClose={() => setAvisoAbierto(false)}
				soloLectura
			/>
		</View>
	);
}

/* Campo con LED y pozo de lectura, del mismo molde que los del AuthPanel */
function Campo({
	label,
	...input
}: { label: string } & React.ComponentProps<typeof TextInput>) {
	const lleno = Boolean(input.value);
	/* Los tres campos son contraseñas, así que el ojo va siempre */
	const [revelado, setRevelado] = useState(false);

	return (
		<View>
			<View className="mb-2 flex-row items-center" style={{ gap: 8 }}>
				<View
					style={{
						width: 10,
						height: 10,
						backgroundColor: lleno ? GO : OFF,
						borderWidth: 1,
						borderColor: INK,
					}}
				/>
				<Text
					style={{ fontFamily: MONO, color: DIM }}
					className="text-[11px] tracking-[1.5px]"
				>
					{label}
				</Text>
			</View>

			<View>
				<TextInput
					{...input}
					secureTextEntry={!revelado}
					autoCapitalize="none"
					autoCorrect={false}
					placeholderTextColor={DIM}
					selectionColor={SKY}
					style={{
						fontFamily: MONO,
						fontSize: 16,
						color: SKY,
						backgroundColor: READOUT,
						borderWidth: 2,
						borderColor: lleno ? SKY : INK,
						paddingHorizontal: 12,
						paddingVertical: 13,
						/* Le deja el lugar al ojo para que el texto no se le meta debajo */
						paddingRight: 48,
					}}
				/>

				<Pressable
					onPress={() => setRevelado((v) => !v)}
					accessibilityRole="button"
					accessibilityLabel={
						revelado ? "Ocultar contraseña" : "Mostrar contraseña"
					}
					accessibilityState={{ selected: revelado }}
					/* Toma todo el alto del pozo: así es fácil de acertar con el pulgar */
					style={{
						position: "absolute",
						right: 2,
						top: 2,
						bottom: 2,
						width: 44,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<IconoOjo abierto={revelado} color={revelado ? SKY : DIM} />
				</Pressable>
			</View>
		</View>
	);
}

function Boton({
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
				style={{ fontFamily: MONO, color: BONE }}
				className="text-[14px] tracking-[1.5px]"
			>
				{label}
			</Text>
		</Pressable>
	);
}
