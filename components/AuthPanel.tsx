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
import Svg, { Path } from "react-native-svg";
import { supabase } from "../lib/supabase";

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

	/* Vacías a propósito: se cablean cuando sumemos esos proveedores */
	const handleGoogle = () => {};
	const handleGithub = () => {};
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
					secureTextEntry
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

			{/* Separador */}
			<View
				className="flex-row items-center"
				style={{ gap: 10, marginTop: 26 }}
			>
				<View style={{ flex: 1, height: 2, backgroundColor: STEEL }} />
				<Text
					style={{
						fontFamily: MONO,
						fontSize: 11,
						letterSpacing: 1.5,
						color: DIM,
					}}
				>
					O CONTINUAR CON
				</Text>
				<View style={{ flex: 1, height: 2, backgroundColor: STEEL }} />
			</View>

			{/* Apilados y a ancho completo: entran cómodos aunque el marco sea angosto */}
			<View style={{ gap: 10, marginTop: 18 }}>
				<ProviderButton
					label="GOOGLE"
					mark={<GoogleMark />}
					onPress={handleGoogle}
				/>
				<ProviderButton
					label="GITHUB"
					mark={<GithubMark />}
					onPress={handleGithub}
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
	...input
}: {
	label: string;
	lit: boolean;
} & React.ComponentProps<typeof TextInput>) {
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
			<TextInput
				{...input}
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
				}}
			/>
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

/* Botón de proveedor externo: ancho completo, con la marca en una ficha cuadrada */
function ProviderButton({
	label,
	mark,
	onPress,
}: {
	label: string;
	mark: React.ReactNode;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);

	return (
		<Pressable
			onPress={onPress}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			accessibilityRole="button"
			accessibilityLabel={`Continuar con ${label}`}
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				gap: 12,
				paddingVertical: 14,
				backgroundColor: pressed ? shade(BONE, 0.82) : BONE,
				borderWidth: 2,
				borderColor: INK,
				borderBottomWidth: pressed ? 2 : 5,
				marginTop: pressed ? 3 : 0,
			}}
		>
			<View
				style={{
					width: 26,
					height: 26,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{mark}
			</View>
			<Text
				style={{
					fontFamily: MONO,
					fontSize: 14,
					letterSpacing: 1.5,
					color: INK,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/* Marcas oficiales dibujadas por vector, así no dependemos de assets externos */
function GoogleMark() {
	return (
		<Svg width={20} height={20} viewBox="0 0 48 48">
			<Path
				fill="#4285F4"
				d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
			/>
			<Path
				fill="#34A853"
				d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
			/>
			<Path
				fill="#FBBC05"
				d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
			/>
			<Path
				fill="#EA4335"
				d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
			/>
		</Svg>
	);
}

function GithubMark() {
	return (
		<Svg width={22} height={22} viewBox="0 0 16 16">
			<Path
				fill={INK}
				fillRule="evenodd"
				clipRule="evenodd"
				d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
			/>
		</Svg>
	);
}
