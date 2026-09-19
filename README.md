# MediSys — Núcleo SaaS (Directorio médico + agendamiento en tiempo real)

Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Google Sheets (`googleapis`) ·
Vercel (Serverless Functions).

Ver el mapa completo de carpetas en [`ARQUITECTURA.md`](./ARQUITECTURA.md).

## Implementado en esta entrega

- `src/utils/googleSheets.ts` — cliente autenticado (Service Account / JWT) + helpers
  genéricos de lectura/escritura/actualización de rangos.
- `src/utils/medicosRepository.ts` — acceso de dominio a la pestaña "Medicos".
- `src/utils/validation.ts` — validación estricta del payload de reservación.
- `src/app/api/booking/crear-cita/route.ts` — endpoint de reservación con protección
  anti-colisión (ver sección "Estrategia anti-colisión" abajo).
- `src/utils/notifications.ts` — WhatsApp (placeholder vía `fetch`) + correo HTML con
  Resend, disparados de forma asíncrona sin bloquear la respuesta al cliente.
- `src/types/index.ts` — tipado compartido de `Medico` y `Cita`.
- `src/components/BookingCalendar.tsx` + `PatientForm.tsx` — flujo de reserva del
  paciente (selección de día/hora + captura de datos + POST), con estados de carga,
  éxito y colisión de horario.
- `src/components/Sidebar.tsx`, `PortalTopBar.tsx`, `HeroBanner.tsx`,
  `DoctorProfileCard.tsx` — capa visual del panel administrativo y del portal público,
  estilo SaaS médico premium (paleta azul `#008BEA`, tarjetas blancas `rounded-3xl`).
- `src/app/(dashboard)/dashboard/page.tsx` + `CitasTable.tsx` +
  `ResumenAgendaCards.tsx` — Dashboard del médico (ruta pública unificada: `/dashboard`):
  resumen ejecutivo (KPIs) y tabla de citas con acciones de confirmar/cancelar en un
  clic.
- `src/app/api/dashboard/actualizar-estatus/route.ts` — endpoint que actualiza el
  estatus de una cita en Google Sheets y dispara la alerta al paciente (ver
  "Dashboard del médico" abajo).
- `src/utils/citasRepository.ts`, `agenda.ts`, `session.ts` — acceso a la pestaña
  "Citas", cálculo de los KPIs y resolución (placeholder) del médico en sesión.
- `scripts/test-conexion-sheets.mjs` + `src/app/api/debug/estado-sheets/route.ts` —
  herramientas de diagnóstico para encontrar la causa exacta de un 401/403 contra
  Google Sheets, en local y en el propio despliegue de Vercel (ver sección
  "Diagnóstico de conexión a Google Sheets" abajo).
- Resto del árbol (`hooks/`, secciones del Sidebar aún sin lógica) — stubs con
  comentarios `TODO` para que el proyecto compile y sirva como punto de partida
  inmediato; todas las rutas del menú lateral existen (sin 404) aunque su contenido
  esté pendiente.

## Dashboard del médico (`/dashboard`)

> **Historial de rutas**: esta vista vivió inicialmente en `/panel/agenda`, con
> `/panel` como raíz de todo el panel administrativo. Se unificó a `/dashboard`
> (carpeta `src/app/(dashboard)/dashboard/`) para que coincida con la ruta con la
> que ya está configurado el proyecto en Vercel — la vista de Agenda ahora es el
> `page.tsx` raíz de `/dashboard`, y el resto de secciones del Sidebar (antes bajo
> `/panel/...`) se movieron a `/dashboard/...` en bloque para no romper la
> navegación (ej. `/dashboard/pacientes`, `/dashboard/whatsapp`).

Lee la pestaña "Citas" filtrando por el `id_medico` en sesión y muestra tres KPIs:

- **Total de Citas del Mes**: todas las citas (cualquier estatus) cuya fecha cae en el
  mes actual.
- **Citas Pendientes por Confirmar**: citas con estatus `Pendiente`, sin filtrar por
  mes — el médico debe verlas todas, agendadas para cuando sea.
- **Ingresos Estimados del Mes**: número de citas `Confirmada` del mes × la tarifa de
  consulta del médico (`medico.precio_consulta`).

Cada cita `Pendiente` tiene dos botones de acción (✓ confirmar, ✕ cancelar) que llaman
a `POST /api/dashboard/actualizar-estatus` con `{ id_cita, estatus }`. El endpoint:

1. Localiza la fila por `id_cita` y escribe la columna H (estatus) con el helper
   `actualizarCelda` del cliente JWT.
2. Dispara — sin esperarla (`fire-and-forget`, igual que en `crear-cita`) — la alerta
   correspondiente al paciente por WhatsApp/correo: "Tu cita con el Dr. [Nombre] ha
   sido CONFIRMADA" al confirmar, o un aviso de cancelación si se cancela (este
   segundo caso no se pidió explícitamente, pero se agregó porque el paciente
   siempre debe saber si su cita fue cancelada).

**Sesión del médico (placeholder sin auth real)**: como todavía no hay login,
`src/utils/session.ts` resuelve el `id_medico` activo desde la cookie
`id_medico_sesion` o la variable de entorno `DEMO_ID_MEDICO`. Configura esta última en
Vercel (o en `.env.local`) para poder ver el dashboard mientras se integra
autenticación real (NextAuth/Auth.js, Clerk, etc.) — `src/app/(dashboard)/dashboard/layout.tsx`
ya tiene el `TODO` marcado en el lugar exacto donde debe ir ese guard.

**Nota de rendimiento**: `listarCitasPorMedico` está envuelta en `cache()` de React,
por lo que el layout (contador del Sidebar) y la página de Agenda comparten una sola
lectura a Google Sheets por petición en vez de duplicarla.

## Diagnóstico de conexión a Google Sheets (401 / 403 en producción)

No tengo acceso directo al dashboard de Vercel ni a sus logs en vivo (no hay un
conector de Vercel disponible en este entorno), así que en vez de eso te dejo
dos herramientas para que tú mismo encuentres la causa exacta en minutos —
más una guía para revisar los logs manualmente.

### 1. Script local — prueba contra tus variables de entorno actuales

```bash
# 1. Trae las variables REALES de Vercel a tu máquina (evita el clásico
#    "en mi .env.local funciona, en Vercel no"):
npx vercel env pull .env.local

# 2. Instala dependencias (una sola vez):
npm install

# 3. Corre el diagnóstico:
npm run diagnostico:sheets
```

El script revisa, en orden, y se detiene en el primer fallo con una
explicación en español de la causa más probable:

1. Que `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` y `GOOGLE_SHEET_ID`
   existan y tengan el formato correcto (llave PEM completa, no truncada).
2. Que la autenticación JWT con Google sea exitosa (esto es lo que se ve como
   `401 Unauthorized` si falla).
3. Que el spreadsheet sea accesible y tenga las pestañas `Medicos` y `Citas`
   (esto es lo que se ve como `403 Forbidden` o `404` si falla).
4. Que una lectura real de datos funcione (`Medicos!A2:B2`).

### 2. Endpoint protegido — prueba contra el entorno REAL de Vercel

El script local usa las variables que tú pegaste en tu máquina; pero el
origen más común del problema es que **Vercel tiene variables distintas**
(una llave pegada mal, un espacio de más, el ambiente "Preview" sin
configurar, etc.). Para comprobar eso sin acceso a los logs:

1. En Vercel → tu proyecto → Settings → Environment Variables, agrega
   `DEBUG_SECRET` con un valor largo y aleatorio (ver `.env.example`) y
   vuelve a desplegar.
2. Visita (reemplazando tu dominio y el secreto):
   `https://tu-proyecto.vercel.app/api/debug/estado-sheets?secret=TU_DEBUG_SECRET`
3. Verás un JSON con un arreglo `diagnosticos`, un paso por cada prueba
   (mismas 4 pruebas que el script), cada uno con `ok: true/false`,
   un `detalle` legible y, si falló, `causasProbables`. Nunca se expone la
   llave privada ni ningún secreto, solo longitudes y códigos de error.
4. **Importante**: borra `DEBUG_SECRET` de Vercel (o la ruta del repositorio)
   en cuanto termines de depurar — si la variable no existe, el endpoint se
   autodesactiva y responde `404`.

### 3. Revisar los logs en vivo de Vercel manualmente

Como complemento (o si prefieres ver el error crudo tal como lo lanza
`googleapis`):

- **Desde el dashboard**: tu proyecto → pestaña **Deployments** → abre el
  deployment activo → pestaña **Logs** (o **Functions** en despliegues más
  viejos) → filtra por la función `api/booking/crear-cita` o
  `api/dashboard/actualizar-estatus` → reproduce la acción (agenda o confirma
  una cita) y observa el error en tiempo real.
- **Desde la CLI**: `npx vercel logs <url-de-tu-deployment>` transmite los
  logs en vivo a tu terminal.

Busca líneas que empiecen con `[googleSheets]` — todos los errores de este
proyecto contra Google Sheets se registran con ese prefijo, junto con el
mensaje original de la API de Google (que normalmente ya trae "PERMISSION_DENIED",
"invalid_grant", etc.).

## Columnas opcionales recomendadas en "Medicos"

Además de las columnas A-I del esquema original, la UI usa estas columnas opcionales
(si faltan, se muestran valores por defecto sin romper el flujo):

| Columna | Campo | Uso |
|---|---|---|
| J | `correo_contacto` | Notificar al médico por correo cuando se agenda una cita |
| K | `cedula_profesional` | Mostrada en la tarjeta de perfil del portal público |
| L | `direccion` | Mostrada en la tarjeta de perfil (si falta, se usa `ciudad`) |
| M | `calificacion` | Estrella dorada en la tarjeta de perfil (si falta, se muestra 5.0) |

## Estrategia anti-colisión (dos pacientes reservando el mismo horario)

Google Sheets no ofrece transacciones ni locks de fila, y las funciones serverless de
Vercel no comparten memoria entre invocaciones. `crear-cita/route.ts` resuelve esto en
dos pasos:

1. **Validación previa**: antes de insertar, lee todas las citas del médico y rechaza de
   inmediato (`409`) si ya existe una fila `Pendiente`/`Confirmada` con la misma
   `fecha`+`hora`.
2. **Verificación post-escritura (compensación)**: justo después de insertar su fila,
   vuelve a leer la hoja. Si detecta que otra petición insertó una fila para el mismo
   horario en el intervalo de milisegundos entre la validación y la escritura ("doble
   clic simultáneo"), se queda como ganadora la fila con el número de fila más bajo
   (la que en verdad llegó primero a Google Sheets) y todas las demás se marcan
   automáticamente como `Cancelada`. El paciente que perdió la carrera recibe `409` y
   debe elegir otro horario.

Para un volumen alto de tráfico concurrente, se recomienda añadir un lock distribuido
(p. ej. Vercel KV / Upstash Redis con `SETNX` sobre la llave `id_medico:fecha:hora`)
delante de este flujo — el diseño actual ya deja el lugar exacto donde conectarlo
(inicio de la función `POST`).

## Estructura de Google Sheets esperada

**Pestaña "Medicos"** (columnas A–J):
`id_medico | nombre | especialidad | ciudad | precio_consulta | foto_url | plan_suscripcion | estatus_pago | horario_config (JSON) | correo_contacto`

> `correo_contacto` (columna J) no estaba en el esquema original pero es necesaria para
> que el módulo de notificaciones pueda avisar al médico de nuevas citas por correo. Si
> la columna no existe o está vacía, el sistema simplemente omite ese correo (no falla).

`horario_config` es un JSON estringificado con esta forma:

```json
{
  "lunes":    { "activo": true,  "inicio": "09:00", "fin": "18:00", "duracionCitaMinutos": 30 },
  "martes":   { "activo": true,  "inicio": "09:00", "fin": "18:00", "duracionCitaMinutos": 30 },
  "miercoles":{ "activo": true,  "inicio": "09:00", "fin": "18:00", "duracionCitaMinutos": 30 },
  "jueves":   { "activo": true,  "inicio": "09:00", "fin": "18:00", "duracionCitaMinutos": 30 },
  "viernes":  { "activo": true,  "inicio": "09:00", "fin": "14:00", "duracionCitaMinutos": 30 },
  "sabado":   { "activo": false, "inicio": "00:00", "fin": "00:00", "duracionCitaMinutos": 30 },
  "domingo":  { "activo": false, "inicio": "00:00", "fin": "00:00", "duracionCitaMinutos": 30 }
}
```

**Pestaña "Citas"** (columnas A–H):
`id_cita | id_medico | nombre_paciente | telefono_paciente | correo_paciente | fecha (YYYY-MM-DD) | hora (HH:mm) | estatus`

La fila 1 de ambas pestañas debe ser encabezados (el código lee a partir de la fila 2).

## Configuración de variables de entorno en Vercel

1. **Crea el Service Account de Google**:
   - Ve a Google Cloud Console → IAM y administración → Cuentas de servicio → Crear.
   - Genera una llave JSON y guárdala (contiene `client_email` y `private_key`).
   - Habilita la **Google Sheets API** en el proyecto de Google Cloud.
2. **Comparte el spreadsheet** con el `client_email` de la cuenta de servicio, dándole
   permiso de **Editor**.
3. **Obtén el `GOOGLE_SHEET_ID`**: es el segmento de la URL entre `/d/` y `/edit`, ej.
   `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`.
4. **En el dashboard de Vercel** → tu proyecto → Settings → Environment Variables, agrega
   (marcando Production, Preview y Development según necesites):

   | Variable | Valor |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | el `client_email` del JSON de la cuenta de servicio |
   | `GOOGLE_PRIVATE_KEY` | el `private_key` del JSON (pega el bloque completo, incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`) |
   | `GOOGLE_SHEET_ID` | el ID del spreadsheet |
   | `RESEND_API_KEY` | tu API key de [resend.com](https://resend.com) |
   | `RESEND_FROM_EMAIL` | remitente verificado en Resend, ej. `citas@tudominio.com` |
   | `WHATSAPP_API_URL` | endpoint de tu proveedor de WhatsApp (Meta Cloud API, Twilio, etc.) |
   | `WHATSAPP_API_TOKEN` | token de autenticación de ese proveedor |

   **Sobre `GOOGLE_PRIVATE_KEY`**: el textarea de Vercel acepta multilínea — puedes pegar
   la llave tal cual, con saltos de línea reales. Si en algún entorno solo puedes pegar
   una sola línea, usa `\n` literales; el código en `googleSheets.ts` hace
   `.replace(/\\n/g, '\n')` para normalizar ambos casos.

5. **En local**, copia `.env.example` a `.env.local` y llena los mismos valores. `.env.local`
   ya está en `.gitignore`, nunca lo subas al repositorio.
6. Corre `npm install` y `npm run dev` para desarrollo local, o conecta el repositorio a
   Vercel para despliegue automático.

## Notas de seguridad

- Nunca se expone `GOOGLE_PRIVATE_KEY` ni tokens al cliente: todo el acceso a Google
  Sheets ocurre exclusivamente en Route Handlers (`runtime = 'nodejs'`), que corren en el
  servidor.
- El endpoint de reservación corre en runtime `nodejs` (no `edge`), requerido por
  `googleapis` y el módulo `crypto`.
- Todos los inputs del paciente se validan y sanitizan en `validation.ts` antes de tocar
  Google Sheets.
