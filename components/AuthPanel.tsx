import { useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { supabase } from "../lib/supabase";
import IconoOjo from "./IconoOjo";

/* Paleta muestreada de los sprites del marco para que todo sea el mismo mundo */
export const INK = "#1e1e14"; // el contorno que comparten todos los assets
const DEEP = "#0e1c3b"; // azul profundo del logo, fondo del panel
const STEEL = "#154f80"; // superficies y separadores
const READOUT = "#2c2c2c"; // negro del ticker
const SKY = "#96e0f7"; // cian del texto del ticker
const BONE = "#eaeadc";
const ALERT = "#ec5147"; // rojo de Spidey y de los pines
const GO = "#52b375"; // verde de los pines
const DIM = "#4d7a91";
const OFF = "#0a1420";

const MONO = Platform.select({ ios: "Courier New", default: "monospace" });

/* Oscurece un hex para el estado presionado; factor < 1 baja el brillo */
function shade(hex: string, factor: number) {
	const n = Number.parseInt(hex.slice(1), 16);
	const ch = (shift: number) =>
		Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * factor)));
	const [r, g, b] = [ch(16), ch(8), ch(0)];
	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type Mode = "login" | "register";
type FieldName = "email" | "password";

export default function AuthPanel() {
	const [mode, setMode] = useState<Mode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [focused, setFocused] = useState<FieldName | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const isLogin = mode === "login";

	const switchMode = (next: Mode) => {
		setMode(next);
		setError(null);
		setNotice(null);
	};

	const handleSubmit = async () => {
		if (submitting) return;
		setError(null);
		setNotice(null);

		if (!email || !password) {
			setError("Completá correo y contraseña.");
			return;
		}

		setSubmitting(true);
		const { error: authError } = isLogin
			? await supabase.auth.signInWithPassword({ email, password })
			: await supabase.auth.signUp({ email, password });
		setSubmitting(false);

		if (authError) {
			setError(authError.message);
			return;
		}

		if (!isLogin) {
			setNotice("Cuenta creada. Revisá tu correo para confirmarla.");
		}
	};

	/* Vacía a propósito: el recupero de contraseña se cablea más adelante */
	const handleForgotPassword = () => {};

	return (
		/* Centrado cuando entra, con scroll cuando el contenido pasa el alto del marco */
		<ScrollView
			style={{ flex: 1, backgroundColor: DEEP }}
			contentContainerStyle={{
				flexGrow: 1,
				justifyContent: "center",
				paddingHorizontal: 20,
				paddingVertical: 50,
			}}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator
			persistentScrollbar
			indicatorStyle="white"
		>
			{/* Línea de estado, en el mismo registro que el ticker del marco */}
			<Text
				style={{
					fontFamily: MONO,
					color: SKY,
					fontSize: 13,
					letterSpacing: 1.5,
				}}
			>
				{isLogin ? "> ACCESO AL TRACKER" : "> NUEVO RASTREADOR"}
			</Text>
			<Text
				style={{
					fontFamily: MONO,
					color: DIM,
					fontSize: 14,
					lineHeight: 20,
					marginTop: 10,
				}}
			>
				{isLogin
					? "Ingresa con tu cuenta para ver los avistamientos en vivo."
					: "Crea una cuenta para seguir los avistamientos en vivo."}
			</Text>

			{/* Selector de modo, como dos teclas de arcade */}
			<View className="flex-row" style={{ gap: 8, marginTop: 24 }}>
				<ModeKey
					label="INGRESAR"
					active={isLogin}
					onPress={() => switchMode("login")}
				/>
				<ModeKey
					label="CREAR CUENTA"
					active={!isLogin}
					onPress={() => switchMode("register")}
				/>
			</View>

			<View style={{ marginTop: 26, gap: 18 }}>
				<Field
					label="CORREO"
					value={email}
					onChangeText={setEmail}
					placeholder="peter@dailybugle.com"
					lit={focused === "email"}
					onFocus={() => setFocused("email")}
					onBlur={() => setFocused(null)}
					keyboardType="email-address"
					autoComplete="email"
				/>
				<Field
					label="CONTRASEÑA"
					value={password}
					onChangeText={setPassword}
					placeholder="••••••••"
					lit={focused === "password"}
					onFocus={() => setFocused("password")}
					onBlur={() => setFocused(null)}
					secure
					autoComplete={isLogin ? "current-password" : "new-password"}
				/>
			</View>

			{isLogin ? (
				<Pressable
					onPress={handleForgotPassword}
					accessibilityRole="button"
					hitSlop={8}
					style={{ alignSelf: "flex-start", marginTop: 12 }}
				>
					<Text
						style={{
							fontFamily: MONO,
							fontSize: 13,
							color: DIM,
							textDecorationLine: "underline",
						}}
					>
						¿Olvidaste tu contraseña?
					</Text>
				</Pressable>
			) : null}

			{error ? (
				<Text
					style={{
						fontFamily: MONO,
						fontSize: 13,
						lineHeight: 18,
						color: ALERT,
						marginTop: 16,
					}}
				>
					{error}
				</Text>
			) : null}

			{notice ? (
				<Text
					style={{
						fontFamily: MONO,
						fontSize: 13,
						lineHeight: 18,
						color: GO,
						marginTop: 16,
					}}
				>
					{notice}
				</Text>
			) : null}

			<View style={{ marginTop: 26 }}>
				<PixelButton
					label={isLogin ? "ENTRAR AL MAPA" : "CREAR CUENTA"}
					background={ALERT}
					foreground={BONE}
					onPress={handleSubmit}
					disabled={submitting}
					loading={submitting}
				/>
			</View>
		</ScrollView>
	);
}

/* Tecla del selector de modo */
function ModeKey({
	label,
	active,
	onPress,
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);
	const base = active ? STEEL : OFF;
	const down = pressed || active;

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			accessibilityRole="tab"
			accessibilityState={{ selected: active }}
			style={{
				flex: 1,
				alignItems: "center",
				paddingVertical: 13,
				backgroundColor: pressed ? shade(base, 0.75) : base,
				borderWidth: 2,
				borderColor: INK,
				borderBottomWidth: down ? 2 : 5,
				marginTop: down ? 3 : 0,
			}}
		>
			<Text
				style={{
					fontFamily: MONO,
					fontSize: 13,
					letterSpacing: 1,
					color: active ? BONE : DIM,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/* Campo con LED y pozo de lectura igual al ticker del marco */
function Field({
	label,
	lit,
	secure,
	...input
}: {
	label: string;
	lit: boolean;
	/* Nace tapado y suma el ojo para poder destaparlo */
	secure?: boolean;
} & React.ComponentProps<typeof TextInput>) {
	const [revelado, setRevelado] = useState(false);

	return (
		<View>
			<View
				className="flex-row items-center"
				style={{ gap: 8, marginBottom: 8 }}
			>
				<View
					style={{
						width: 10,
						height: 10,
						backgroundColor: lit ? GO : OFF,
						borderWidth: 1,
						borderColor: INK,
					}}
				/>
				<Text
					style={{
						fontFamily: MONO,
						fontSize: 12,
						letterSpacing: 1.5,
						color: lit ? SKY : DIM,
					}}
				>
					{label}
				</Text>
			</View>
			<View>
				<TextInput
					{...input}
					secureTextEntry={secure && !revelado}
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
						borderColor: lit ? SKY : INK,
						paddingHorizontal: 12,
						paddingVertical: 13,
						/* Le deja el lugar al ojo para que el texto no se le meta debajo */
						paddingRight: secure ? 48 : 12,
					}}
				/>

				{secure ? (
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
				) : null}
			</View>
		</View>
	);
}

/* Botón con bisel de pixel-art: al apretarlo se hunde y el fondo baja de brillo */
function PixelButton({
	label,
	background,
	foreground,
	onPress,
	disabled,
	loading,
}: {
	label: string;
	background: string;
	foreground: string;
	onPress: () => void;
	disabled?: boolean;
	loading?: boolean;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ disabled, busy: loading }}
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				gap: 10,
				paddingVertical: 16,
				backgroundColor: pressed ? shade(background, 0.78) : background,
				opacity: disabled ? 0.6 : 1,
				borderWidth: 2,
				borderColor: INK,
				borderBottomWidth: pressed ? 2 : 6,
				marginTop: pressed ? 4 : 0,
			}}
		>
			{loading ? <ActivityIndicator color={foreground} /> : null}
			<Text
				style={{
					fontFamily: MONO,
					fontSize: 16,
					letterSpacing: 1.5,
					color: foreground,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}
