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
- `src/app/(auth)/login/page.tsx` + `LoginForm.tsx` + `src/app/api/auth/login/route.ts`
  + `logout/route.ts` — login real con contraseña (reemplaza a `DEMO_ID_MEDICO`), cookie
  de sesión firmada con HMAC, y guard de sesión en `(dashboard)/dashboard/layout.tsx`
  (ver sección "Autenticación de médicos" abajo).
- `src/app/(dashboard)/dashboard/odontograma/page.tsx` + `src/components/odontograma/*`
  + `src/utils/odontogramaRepository.ts` + `src/app/api/odontograma/*` — Módulo de
  Odontograma IA e Historial Clínico: mapa dental interactivo por superficie (FDI,
  dentición adulta/infantil), leyenda de tratamientos, bitácora de hallazgos de la
  sesión, y **persistencia real en la pestaña "Odontogramas" de Google Sheets** vía
  el botón "Guardar Evolución" (ver sección "Módulo de Odontograma IA" abajo).
- `src/app/(dashboard)/dashboard/pacientes/nuevo/page.tsx` + `src/components/pacientes/*`
  + `src/utils/pacientesRepository.ts` + `src/app/api/pacientes/crear/route.ts` —
  Captura de Pacientes Nuevos: formulario premium de alta de pacientes reales
  (persistidos en la pestaña "Pacientes" de Google Sheets), que redirige al terminar
  directo al odontograma del paciente recién creado (ver sección "Captura de
  Pacientes Nuevos" abajo).
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

**Sesión del médico**: `src/utils/session.ts` resuelve el `id_medico` activo desde la
cookie firmada `id_medico_sesion` (ver sección "Autenticación de médicos" abajo). El
placeholder `DEMO_ID_MEDICO` ya no existe — sin sesión válida, el layout redirige a
`/login`.

**Nota de rendimiento**: `listarCitasPorMedico` está envuelta en `cache()` de React,
por lo que el layout (contador del Sidebar) y la página de Agenda comparten una sola
lectura a Google Sheets por petición en vez de duplicarla.

## Módulo de Odontograma IA e Historial Clínico (`/dashboard/odontograma`)

Mapa dental interactivo con registro de hallazgos por superficie, con **persistencia
real en Google Sheets** (pestaña "Odontogramas") — ya no es un estado de demostración
que se pierde al recargar la página.

### ⚠️ Paso manual requerido en tu Google Sheet

Antes de usar "Guardar Evolución" en producción, crea a mano una pestaña nueva
llamada **exactamente** `Odontogramas` en tu spreadsheet (la misma hoja que
`GOOGLE_SHEET_ID` ya apunta), con estos encabezados en la **Fila 1**, en este orden
exacto:

| Columna | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Encabezado | `id_odontograma` | `id_paciente` | `id_medico` | `fecha` | `datos_dentales` | `notas_evolucion` |

`datos_dentales` guarda el `EstadoOdontograma` completo (mapa de número de pieza FDI →
estado de sus 5 superficies) serializado con `JSON.stringify` — es la única columna
que no es texto legible a simple vista; las demás sí lo son. Sin esta pestaña, tanto
"Guardar Evolución" como la carga del historial fallarán con un error controlado (ver
`odontogramaRepository.ts`) en vez de romper la página.

### Flujo de guardado y carga

- **Guardar** (botón "Guardar Evolución", esquina superior derecha): recopila el
  estado actual de las piezas del paciente activo + un resumen textual de los
  hallazgos de la sesión (ej. *"Pieza 14: Caries en superficie Oclusal; Pieza 26:
  Corona / Puente (toda la pieza)."*) y hace `POST /api/odontograma/guardar`. Cada
  clic **inserta una fila nueva** (nunca sobreescribe) — así la hoja termina siendo un
  historial completo de snapshots por paciente, no solo el estado más reciente.
  Mientras guarda, el botón muestra un spinner (`Loader2` de `lucide-react`) y queda
  deshabilitado; al terminar, aparece una alerta flotante (Toast) de éxito o error en
  la esquina inferior derecha, que se cierra sola a los 4 segundos o con el botón ✕.
- **Cargar**: al abrir `/dashboard/odontograma`, el Server Component (`page.tsx`) lee
  directamente de `odontogramaRepository.ts` (sin pasar por HTTP) el **último**
  registro guardado del primer paciente de la lista de demostración, decodifica
  `datos_dentales` con `JSON.parse` + lo sanea (`sanearEstadoOdontograma`), y lo pasa
  como `estadoInicial` a `<OdontogramaModule />` — el dentista ve su historial real
  desde la primera pintura de la página, sin parpadeo. Si el dentista cambia de
  paciente desde el buscador (lo que ocurre *sin* recargar la página), el propio
  `OdontogramaModule.tsx` trae el historial de ese otro paciente con `GET
  /api/odontograma/:idPaciente`, y lo cachea en memoria para no repetir la consulta si
  vuelve a seleccionar al mismo paciente en la misma visita.
- **"Último registro" = modelo de solo-anexar**: como cada guardado es un `INSERT`
  (`agregarFila` → `values.append`), "el último odontograma de un paciente" se resuelve
  recorriendo la hoja y quedándose con la última fila que coincide con su
  `id_paciente`. Si algún día reordenas filas a mano en el Sheet, esa suposición deja
  de sostenerse — no ocurre en el flujo normal de la app.
- **Saneamiento defensivo**: cualquier valor que llegue de la hoja en `datos_dentales`
  pasa por `sanearEstadoOdontograma()` (en `tipos.ts`) antes de tocar la UI — descarta
  piezas con claves no numéricas, superficies faltantes o tratamientos con un id
  desconocido, en vez de lanzar una excepción por una celda editada a mano o corrupta.
- **`id_medico` nunca viaja desde el cliente**: `POST /api/odontograma/guardar` lo
  resuelve siempre de la cookie de sesión firmada (`obtenerIdMedicoSesion()`), igual
  que el resto del panel — el body solo manda `idPaciente`, `estado` y
  `notasEvolucion`.

Estructura (`src/components/odontograma/`):

- `tipos.ts` — catálogos y tipos compartidos: las 5 superficies clínicas
  (`vestibular`, `lingual`/palatina, `mesial`, `distal`, `oclusal`), los 4
  tratamientos de la leyenda con su color normalizado (Caries = rojo, Tratamiento
  Realizado = azul, Corona/Puente = verde, Ausente/Extracción = gris con tachado), el
  layout de numeración FDI para dentición adulta (32 piezas: cuadrantes 1-4, 11-48) e
  infantil/decidua (20 piezas: cuadrantes 5-8, 51-85), y las funciones de
  serialización (`sanearEstadoOdontograma`, `construirNotasEvolucion`,
  `describirHallazgo`) que comparten el cliente y el repositorio de servidor.
- `Diente.tsx` — SVG de una pieza dental ("diagrama de sobre") con sus 5 superficies
  como formas independientes y clicables; cada una se pinta con relleno suave +
  borde del color del tratamiento aplicado. Si la pieza está "Ausente/Extracción",
  además dibuja una X diagonal completa sobre toda la pieza.
- `LeyendaTratamientos.tsx` — panel lateral derecho con los 4 tratamientos; al hacer
  clic en uno, queda "activo" y el siguiente clic sobre cualquier superficie del
  odontograma lo aplica de inmediato (atajo para capturar varios hallazgos iguales
  seguidos, sin abrir el popover cada vez).
- `PopoverSuperficie.tsx` — panel emergente centrado (overlay + backdrop) que se
  abre al hacer clic en una superficie sin tratamiento activo en la leyenda; permite
  elegir el diagnóstico para esa superficie puntual.
- `BuscadorPacientes.tsx` — buscador con desplegable sobre una lista fija de
  pacientes de prueba (`PACIENTES_DEMO` en `tipos.ts`); cada paciente tiene su propio
  estado de odontograma e historial, independientes entre sí, y ahora también su
  propio historial real en Google Sheets.
- `HistorialEvolucion.tsx` — lista textual de los hallazgos registrados en la sesión
  actual del paciente activo (más reciente primero), ej. *"Pieza 14: Caries en
  superficie Oclusal."* Sigue siendo solo de la sesión en curso (no se relee de la
  hoja) — lo que cambia con este paso es que, al guardar, ese resumen sí queda escrito
  en `notas_evolucion`.
- `ToastGuardado.tsx` — alerta flotante de éxito/error para el resultado de "Guardar
  Evolución"; se autocierra a los 4 segundos (`AUTO_CIERRE_TOAST_MS`) o con su botón ✕.
- `OdontogramaModule.tsx` — orquestador `'use client'` que concentra todo el estado
  (`estadoPorPaciente`, `historialPorPaciente`, qué pacientes ya se cargaron desde la
  hoja) y la lógica de negocio central: `aplicarTratamiento(...)` (con el caso especial
  de "Ausente/Extracción" propagándose a las 5 superficies a la vez),
  `cargarHistorialPaciente(...)` (fetch al cambiar de paciente) y `guardarEvolucion()`
  (fetch al hacer clic en "Guardar Evolución").

`src/utils/odontogramaRepository.ts` es la única capa que sabe leer/escribir la
pestaña "Odontogramas" (mismo patrón que `citasRepository.ts` / `medicosRepository.ts`
para el resto de la app): expone `guardarOdontograma(...)` y
`obtenerUltimoOdontogramaPorPaciente(idPaciente)`.

`src/app/api/odontograma/guardar/route.ts` (`POST`) y
`src/app/api/odontograma/[idPaciente]/route.ts` (`GET`) son las dos API routes nuevas,
ambas protegidas por la misma cookie de sesión firmada que el resto de `/dashboard/*`
(sin sesión válida, responden 401).

`src/app/(dashboard)/dashboard/odontograma/page.tsx` sigue siendo un server component
async liviano: la protección de sesión y el `<PanelShell />` ya los provee
`dashboard/layout.tsx`; lo único que agrega esta página es la lectura inicial del
historial del primer paciente antes de montar `<OdontogramaModule />`.

**Paciente real vía `?paciente=<id_paciente>`**: cuando el formulario de "Captura de
Pacientes Nuevos" (siguiente sección) registra a alguien, redirige aquí con ese query
param — `page.tsx` busca ese `id_paciente` en la pestaña "Pacientes" y, si existe, lo
usa como paciente inicial (con la dentición sugerida calculada de su fecha de
nacimiento vía `sugerirDenticionPorEdad`, en `src/utils/edad.ts`). Si el id no viene o
no corresponde a ningún paciente real, cae al primer paciente de `PACIENTES_DEMO`,
igual que antes. **Limitación conocida**: el buscador de pacientes dentro del módulo
(`BuscadorPacientes.tsx`) todavía solo busca sobre `PACIENTES_DEMO` — un paciente real
recién registrado no aparece ahí todavía si el dentista navega a otra pantalla y
regresa sin el query param; para volver a abrir su odontograma hay que repetir la URL
`/dashboard/odontograma?paciente=<su id_paciente>` (ej. desde un futuro listado en
`/dashboard/pacientes`, que ya tiene `listarPacientesPorMedico()` listo en
`pacientesRepository.ts` para alimentarlo).

## Captura de Pacientes Nuevos (`/dashboard/pacientes/nuevo`)

Formulario premium de alta de pacientes reales — el paso previo obligatorio antes de
poder hacerles un odontograma con sentido clínico real.

### ⚠️ Paso manual requerido en tu Google Sheet

Igual que con "Odontogramas", crea a mano una pestaña llamada **exactamente**
`Pacientes` en tu spreadsheet, con estos encabezados en la **Fila 1**, en este orden
exacto:

| Columna | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| Encabezado | `id_paciente` | `id_medico` | `nombre_completo` | `telefono` | `correo` | `fecha_nacimiento` | `antecedentes_medicos` | `fecha_registro` |

### Flujo

1. El dentista llena el formulario (`FormularioNuevoPaciente.tsx`): nombre completo,
   teléfono y fecha de nacimiento son requeridos; correo y antecedentes
   médicos (alergias/enfermedades) son opcionales. Cada campo valida en el cliente
   con las mismas reglas que el servidor (nombre ≥ 3 caracteres, teléfono con formato
   razonable, correo con formato válido si se proporciona, fecha de nacimiento no
   futura) — es solo una ayuda de UX; la validación vinculante ocurre en el servidor.
2. Al hacer clic en "Registrar Paciente" (botón azul con degradado, ícono `UserPlus`
   de `lucide-react` que cambia a un spinner `Loader2` mientras se guarda), se hace
   `POST /api/pacientes/crear`.
3. La API genera un `id_paciente` con formato `PAC-12345` (5 dígitos, verificado contra
   los ids existentes en la hoja para evitar colisiones), resuelve `id_medico` de la
   cookie de sesión firmada (nunca del body — mismo principio que en
   "Guardar Evolución"), inserta la fila en "Pacientes" y devuelve el `id_paciente`.
4. Con la respuesta exitosa, el formulario redirige de inmediato a
   `/dashboard/odontograma?paciente=<id_paciente>` — el dentista cae directo en el
   odontograma en blanco de ese paciente recién creado, listo para el primer
   diagnóstico.

Estructura:

- `src/utils/pacientesRepository.ts` — capa de acceso a la pestaña "Pacientes" (mismo
  patrón que `medicosRepository.ts`/`citasRepository.ts`/`odontogramaRepository.ts`):
  `crearPaciente(...)`, `obtenerPacientePorId(...)` y `listarPacientesPorMedico(...)`
  (esta última todavía sin consumidor en la UI — queda lista para el futuro listado en
  `/dashboard/pacientes`).
- `src/app/api/pacientes/crear/route.ts` (`POST`) — protegido por sesión (401 sin
  cookie válida), valida el body y llama a `crearPaciente(...)`.
- `src/components/pacientes/CampoFormulario.tsx` — campo de formulario reutilizable
  (label + input/textarea con ícono de `lucide-react` incrustado + mensaje de error),
  usado por los 5 campos del formulario.
- `src/components/pacientes/FormularioNuevoPaciente.tsx` — orquestador `'use client'`
  del formulario: estado de los 5 campos, validación, `fetch` a la API y redirección
  final.
- `src/app/(dashboard)/dashboard/pacientes/nuevo/page.tsx` — server component mínimo,
  mismo patrón que el resto de `/dashboard/*` (guard de sesión de sobra + monta el
  formulario de cliente).
- `src/utils/edad.ts` — `calcularEdad(fechaNacimientoIso)` y
  `sugerirDenticionPorEdad(edad)`, compartidas entre este formulario (para mostrar/
  calcular en el futuro) y `dashboard/odontograma/page.tsx` (para sugerir dentición
  adulta/infantil de un paciente real al abrir su odontograma).

## Autenticación de médicos (`/login`)

Sistema de login con usuario/contraseña que reemplaza por completo al placeholder
`DEMO_ID_MEDICO`. Todo el árbol `/dashboard/*` queda protegido: sin sesión válida,
`src/app/(dashboard)/dashboard/layout.tsx` redirige a `/login` antes de renderizar
nada (ni de tocar Google Sheets).

**Columnas de credenciales en "Medicos"**: el requisito original pedía las columnas K
(`usuario_login`) y L (`password_hash`), pero esas dos ya estaban en uso desde el
módulo del portal público (`cedula_profesional` y `direccion` — ver "Columnas
opcionales recomendadas" abajo). Para no romper esas columnas, las credenciales se
agregaron al final de la hoja:

| Columna | Campo | Uso |
|---|---|---|
| N | `usuario_login` | Correo o usuario con el que el médico inicia sesión |
| O | `password_hash` | Hash bcrypt de la contraseña (o texto plano solo para pruebas) |

Genera un hash real para pegar en la columna O con:

```bash
npm run generar:password-hash -- "la-contraseña-del-medico"
```

Si la columna O no contiene un hash bcrypt (`$2a$`/`$2b$`/`$2y$`), `src/utils/password.ts`
compara como texto plano (en tiempo constante) y deja un `console.warn` — sirve para
probar rápido, pero migra a bcrypt antes de dar acceso a médicos reales.

> ⚠️ **Si pusiste `usuario_login`/`password_hash` en K/L en vez de N/O**: el login
> sigue funcionando — `authRepository.ts` cae a K/L como compatibilidad temporal si
> no encuentra coincidencia en N/O (y lo deja registrado con `console.warn` en los
> logs de Vercel) — pero **esos mismos valores se muestran públicamente** en
> `/medicos/[id]` como "Cédula profesional" y "Dirección" (`DoctorProfileCard.tsx`).
> Entra a la página pública de tu médico ahora mismo y verifica si tu correo o
> contraseña aparecen ahí. Si es así, corta el contenido de K y L, pégalo en N y O,
> y borra K/L (o pon ahí la cédula/dirección reales) lo antes posible.

**Flujo**:

1. `POST /api/auth/login` recibe `{ usuario, password }`, busca las credenciales con
   `authRepository.buscarCredencialesPorUsuario` (independiente de `medicosRepository.ts`
   — el hash nunca pasa por el tipo `Medico` compartido con la UI) y verifica la
   contraseña con `verificarPassword`.
2. Si coinciden, configura la cookie `id_medico_sesion` **firmada con HMAC-SHA256**
   (`SESSION_SECRET`), `httpOnly`, `sameSite=lax`, `secure` en producción, con
   expiración de 7 días.
3. `obtenerIdMedicoSesion()` valida esa firma en cada request; si la cookie no existe,
   está corrupta, fue forjada a mano, o `SESSION_SECRET` no está configurado, se trata
   como "sin sesión" (falla cerrado) en vez de confiar en un id sin firma.
4. `POST /api/auth/logout` borra la cookie — hay un botón "Cerrar sesión" al final del
   Sidebar (no se pidió explícitamente, pero un login sin logout deja atrapado al
   médico).

**Por qué firmar la cookie**: es `httpOnly` (JavaScript del navegador no puede leerla
ni editarla), pero eso no evita que alguien la fabrique a mano con un cliente HTTP
(`Cookie: id_medico_sesion=OTRO_ID`) para suplantar a otro médico. La firma HMAC hace
que una cookie sin la firma correcta se rechace de inmediato.

**Por qué el guard vive en el layout y no en `middleware.ts`**: la verificación de
firma usa el módulo `crypto` de Node (`createHmac`/`timingSafeEqual`), que no está
disponible en el Edge Runtime donde corre el middleware de Next.js por defecto.
Moverlo ahí es posible reescribiéndolo con la Web Crypto API (`crypto.subtle`), pero no
es necesario: el layout ya bloquea el acceso antes de leer Google Sheets.

**Límite de intentos de login**: `POST /api/auth/login` incluye un límite básico (5
intentos / 15 min por IP) en memoria del proceso serverless — es una mitigación
best-effort contra fuerza bruta trivial, no un rate limiter real (no persiste entre
cold starts ni se comparte entre instancias). Para tráfico serio, mover esto a Vercel
KV / Upstash Redis delante del handler.

**Variable de entorno requerida**: `SESSION_SECRET` (ver `.env.example`) — sin ella,
`obtenerIdMedicoSesion()` trata cualquier cookie como inválida (falla cerrado) y nadie
puede entrar al dashboard. Genera un valor con `openssl rand -hex 32` y nunca lo
reutilices entre entornos.

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

### 2.1 Endpoint protegido — diagnosticar el LOGIN específicamente (401 al iniciar sesión)

Mismo gate que el anterior (`DEBUG_SECRET`), pero corre la búsqueda de
credenciales real (`buscarCredencialesPorUsuario` + `verificarPassword`, las
mismas funciones que usa `POST /api/auth/login`) y te dice exactamente en
qué paso falla — sin nunca exponer la contraseña ni el hash:

```bash
curl -X POST "https://tu-proyecto.vercel.app/api/debug/probar-login?secret=TU_DEBUG_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"usuario":"ruben@medisys.com","password":"admin123"}'
```

Te dirá si `SESSION_SECRET` está configurada, si encontró la fila en
"Medicos" (y si el valor guardado es un hash bcrypt o texto plano), y si la
contraseña coincide. Bórralo (o borra `DEBUG_SECRET`) cuando termines.

**Atajo sin deploy para entrar mientras depuras**: si ya tienes el valor real
de `SESSION_SECRET` (Vercel → Environment Variables), puedes fabricar tú
mismo una cookie de sesión válida sin tocar el código:

```bash
node -e "
const crypto = require('crypto');
const secreto = process.argv[1];
const idMedico = 'm1';
console.log('m1.' + crypto.createHmac('sha256', secreto).update(idMedico).digest('hex'));
" "EL_VALOR_REAL_DE_TU_SESSION_SECRET"
```

Copia el resultado, pégalo como cookie `id_medico_sesion` en DevTools → Application/Storage → Cookies de tu sitio en producción, y recarga `/dashboard`.

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
| N | `usuario_login` | Correo/usuario de acceso al dashboard (ver "Autenticación de médicos") |
| O | `password_hash` | Hash bcrypt de la contraseña (o texto plano solo para pruebas) |

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

**Pestaña "Odontogramas"** (columnas A–F) — **debes crearla a mano**, no viene en la
plantilla original; ver la sección "Módulo de Odontograma IA" arriba para el detalle
completo:
`id_odontograma | id_paciente | id_medico | fecha (YYYY-MM-DD) | datos_dentales (JSON) | notas_evolucion`

**Pestaña "Pacientes"** (columnas A–H) — **debes crearla a mano**, no viene en la
plantilla original; ver la sección "Captura de Pacientes Nuevos" arriba para el
detalle completo:
`id_paciente (PAC-12345) | id_medico | nombre_completo | telefono | correo | fecha_nacimiento (YYYY-MM-DD) | antecedentes_medicos | fecha_registro (YYYY-MM-DD)`

La fila 1 de las cuatro pestañas debe ser encabezados (el código lee a partir de la fila 2).

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
