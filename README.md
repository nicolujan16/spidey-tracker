# Spidey-Tracker

Mapa colaborativo en tiempo real para reportar avistamientos de Spider-Man y confirmarlos por consenso entre usuarios.

![React Native](https://img.shields.io/badge/React_Native-0.86.2-20232a?logo=react&logoColor=61dafb)
![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Realtime-3ecf8e?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)

![demo](./docs/demo.gif)

---

## Qué hace

- **Mapa en tiempo real.** Los avistamientos de las últimas 24 h se dibujan sobre Google Maps y se actualizan solos por Supabase Realtime: si otro usuario reporta algo, el pin aparece sin recargar nada.
- **Reportes geolocalizados.** El punto sale del GPS ("acá mismo") o de un long-press sobre el mapa, para reportar algo que viste en otro lado.
- **Reportes retroactivos.** Se puede cargar un avistamiento de hasta 24 h atrás, en pasos de 15 minutos.
- **Confirmación automática por consenso.** Cuando 2 usuarios distintos reportan dentro de 100 metros y ±5 minutos, ambos reportes pasan de `pending` a `confirmed`. La regla vive en la base de datos, no en la app.
- **Pines por estado.** Verde confirmado, rojo sin confirmar, con filtros por estado y por cercanía (5 km alrededor tuyo).
- **Autenticación con email y contraseña.** Alta, acceso, sesión persistida y cambio de contraseña desde la app.
- **Historial propio y feed global.** "Mis avistamientos" con el detalle de lo que reportaste y "Últimos avistamientos" con lo que está pasando ahora.

## Stack

| Pieza | Qué resuelve | Versión |
| --- | --- | --- |
| [React Native](https://reactnative.dev/) | App nativa Android/iOS | 0.86.2 |
| [Expo](https://docs.expo.dev/versions/v57.0.0/) | Toolchain, módulos nativos y builds | SDK 57 |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Navegación basada en archivos | 57 |
| [TypeScript](https://www.typescriptlang.org/) | Tipado del proyecto entero | 6.0 |
| [Supabase](https://supabase.com/docs) | Postgres, Auth y Realtime | supabase-js 2.112 |
| [react-native-maps](https://github.com/react-native-maps/react-native-maps) | Mapa con Google Maps en ambas plataformas | 1.27.2 |
| [expo-location](https://docs.expo.dev/versions/v57.0.0/sdk/location/) | Permisos y seguimiento de ubicación | 57 |
| [NativeWind](https://www.nativewind.dev/) | Tailwind aplicado a componentes de React Native | 4.2 |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | Iconos vectoriales | 15.15.4 |

---

## Setup paso a paso

### 1. Prerrequisitos

- **Node 20 o superior** (lo pide el SDK 57).
- **Cuenta de [Supabase](https://supabase.com/)** con un proyecto creado.
- **API key de Google Maps** desde [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), con **Maps SDK for Android** y **Maps SDK for iOS** habilitados en el mismo proyecto de Cloud. Sin esas dos APIs prendidas el mapa carga gris.
- **Cuenta de [Expo](https://expo.dev/)** y el CLI de EAS: `npm install -g eas-cli`.
- Para compilar a iOS, además, una cuenta de Apple Developer.

### 2. Clonar e instalar

```bash
git clone https://github.com/<tu-usuario>/spidey-tracker.git
cd spidey-tracker
npx expo install
```

Usá `npx expo install` y no `npm install` a secas. `expo install` resuelve cada dependencia contra la matriz de compatibilidad del SDK 57 e instala la versión que ese SDK espera. Con `npm install` te llevás el último release de cada paquete, y una versión de `react-native-maps` o `react-native-reanimated` fuera de rango rompe el build nativo, no el bundle de JS: el error aparece recién en EAS, veinte minutos después. La misma regla vale para agregar paquetes más adelante (`npx expo install <paquete>`).

### 3. Variables de entorno

Copiá el ejemplo y completá los tres valores:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=       # Supabase → Project Settings → Data API
EXPO_PUBLIC_SUPABASE_ANON_KEY=  # la publishable/anon key, no la service_role
EXPO_PUBLIC_MAPS_KEY=           # la API key de Google Maps
```

Dos cosas a tener en cuenta:

- Todo lo que empieza con `EXPO_PUBLIC_` queda **incrustado en el bundle**. La anon key está diseñada para eso y quien protege los datos es RLS; la `service_role` no va nunca acá.
- `EXPO_PUBLIC_MAPS_KEY` la consume [`app.config.ts`](./app.config.ts) para configurar el plugin nativo de `react-native-maps`, así que se resuelve **en tiempo de build**: si la cambiás, hay que volver a compilar. Restringí esa key por package name + SHA-1 en Google Cloud antes de publicar nada.

### 4. Base de datos

En el proyecto de Supabase, abrí **SQL Editor** y corré el script completo: tabla `sightings`, RLS, la función `haversine_distance`, el trigger de consenso, la constraint de la ventana de 24 h y el alta en la publicación de Realtime.

El script está entero, y explicado línea por línea, en **[ProjectDescription.md](./ProjectDescription.md)**.

Después, en **Authentication → Providers → Email**, decidí si querés confirmación por correo. Si la dejás activada, cada cuenta nueva tiene que validar el mail antes de poder entrar (la app ya avisa "revisá tu correo"); si la apagás, el alta entra directo, que es más cómodo para probar.

### 5. Build de desarrollo con EAS

Este proyecto necesita un **development build**: un binario tuyo que ya trae los módulos nativos compilados adentro.

```bash
eas login
eas init          # solo si forkeaste el repo: crea tu propio projectId
eas build --profile development --platform android
```

Si forkeaste, acordate de reemplazar `extra.eas.projectId` y `owner` en [`app.json`](./app.json) por los tuyos — `eas init` lo hace por vos.

Cuando termina, EAS te da un QR y un `.apk` para instalar en el dispositivo o emulador. El perfil `development` está definido en [`eas.json`](./eas.json) con `developmentClient: true` y distribución interna.

### 6. Levantar el proyecto

```bash
npx expo start --dev-client
```

Abrí la app que instalaste (no Expo Go) y escaneá el QR. Desde ahí, hot reload normal.

---

## Esto no corre en Expo Go

Expo Go es un binario fijo con un set cerrado de módulos nativos, y este proyecto usa dos que no están adentro: **`react-native-maps`** (con la key de Google Maps inyectada por config plugin) y **`expo-location`** con sus permisos declarados. Si lo abrís en Expo Go, el mapa no renderiza y la app revienta al pedir la ubicación.

Por eso el paso 5 no es opcional: hay que generar el development build una vez. Después de eso, el ciclo de trabajo es el mismo de siempre, y solo necesitás recompilar cuando agregues un módulo nativo nuevo o cambies algo de `app.config.ts`.

---

## Cómo está hecho

Si te interesa el detrás de escena — el modelo de datos, las policies de RLS, cómo funciona el trigger de consenso y por qué se tomó cada decisión — está todo en **[ProjectDescription.md](./ProjectDescription.md)**.
