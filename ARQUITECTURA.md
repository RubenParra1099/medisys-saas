# Mapa de arquitectura — MediSys SaaS (Next.js App Router)

```
medisys-saas/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── README.md
├── public/
│   └── images/                              # Placeholders de fotos, logos
└── src/
    ├── app/
    │   ├── layout.tsx                       # Layout raíz (fuentes, <html>, providers)
    │   ├── page.tsx                         # Home pública
    │   ├── globals.css                      # Tailwind base
    │   │
    │   ├── (public)/                        # Grupo de rutas públicas (sin auth)
    │   │   ├── buscar/
    │   │   │   └── page.tsx                 # Directorio / buscador de médicos
    │   │   └── medicos/
    │   │       └── [id]/
    │   │           └── page.tsx             # Perfil público + calendario de reserva
    │   │
    │   ├── (auth)/                          # Grupo de rutas públicas de acceso
    │   │   └── login/
    │   │       └── page.tsx                 # ✅ Login del médico (usuario/contraseña)
    │   │
    │   ├── (dashboard)/                     # Grupo de rutas privadas (médico autenticado)
    │   │   └── dashboard/                   # Ruta unificada con la config real de Vercel
    │   │       ├── layout.tsx               # Layout con guard de sesión/suscripción + Sidebar
    │   │       ├── page.tsx                 # ✅ Agenda Médica: KPIs + <CitasTable /> (raíz de /dashboard)
    │   │       ├── suscripcion/
    │   │       │   └── page.tsx             # Estado de plan_suscripcion y estatus_pago
    │   │       ├── odontograma/
    │   │       │   └── page.tsx             # ✅ Odontograma IA (monta <OdontogramaModule />)
    │   │       ├── pacientes/
    │   │       │   ├── page.tsx             # ✅ Listado real (KPIs + <TablaPacientes />)
    │   │       │   └── nuevo/
    │   │       │       └── page.tsx         # ✅ Captura de Pacientes Nuevos (monta <FormularioNuevoPaciente />)
    │   │       ├── documentos/
    │   │       │   └── page.tsx             # ✅ Cotizador de Presupuestos y Control de Abonos (KPIs + <TablaMovimientos />)
    │   │       ├── consultorio/
    │   │       │   └── page.tsx             # ✅ Mi Consultorio (monta <FormularioConsultorio />)
    │   │       ├── correos/
    │   │       │   └── page.tsx             # ✅ Correos Autorizados (monta <ListaUsuariosAutorizados />)
    │   │       ├── recordatorios/
    │   │       │   └── page.tsx             # ✅ Recordatorios de Citas (monta <MesaControlRecordatorios />)
    │   │       ├── historial/
    │   │       │   └── page.tsx             # ✅ Historial Clínico (monta <TimelineHistorial />)
    │   │       ├── cotizador/
    │   │       │   └── page.tsx             # ✅ Cotizador de Presupuestos (monta <PanelCotizador />)
    │   │       ├── galeria/
    │   │       │   └── page.tsx             # ✅ Galería Clínica (monta <GridGaleria />)
    │   │       ├── whatsapp/
    │   │       │   └── page.tsx             # Stub — sección del Sidebar aún sin lógica
    │   │
    │   └── api/                             # Serverless Functions (Vercel)
    │       ├── booking/
    │       │   ├── crear-cita/
    │       │   │   └── route.ts             # ✅ Implementado en esta entrega
    │       │   ├── cancelar-cita/
    │       │   │   └── route.ts             # Stub — cambia estatus a "Cancelada"
    │       │   └── disponibilidad/
    │       │       └── route.ts             # Stub — calcula huecos libres desde horario_config
    │       ├── medicos/
    │       │   └── route.ts                 # Stub — listado/búsqueda con filtros
    │       ├── auth/
    │       │   ├── login/
    │       │   │   └── route.ts             # ✅ Valida credenciales + configura cookie firmada
    │       │   └── logout/
    │       │       └── route.ts             # ✅ Borra la cookie de sesión
    │       ├── odontograma/
    │       │   ├── guardar/
    │       │   │   └── route.ts             # ✅ POST — inserta un snapshot en "Odontogramas"
    │       │   └── [idPaciente]/
    │       │       └── route.ts             # ✅ GET — último snapshot guardado de un paciente
    │       ├── pacientes/
    │       │   └── crear/
    │       │       └── route.ts             # ✅ POST — inserta una fila en "Pacientes"
    │       ├── saldos/
    │       │   └── crear/
    │       │       └── route.ts             # ✅ POST — inserta una fila en "Saldos" (cotización o abono)
    │       ├── consultorio/
    │       │   └── guardar/
    │       │       └── route.ts             # ✅ POST — upsert de la fila del médico en "Consultorios"
    │       ├── usuarios-autorizados/
    │       │   └── invitar/
    │       │       └── route.ts             # ✅ POST — inserta una fila en "Usuarios_Autorizados"
    │       ├── recordatorios/
    │       │   └── actualizar/
    │       │       └── route.ts             # ✅ POST — sobrescribe columna P (JSON) de "Medicos" (N/O son login, intocables)
    │       ├── historial/
    │       │   └── crear/
    │       │       └── route.ts             # ✅ POST — inserta una fila en "Historiales_Clinicos"
    │       ├── presupuestos/
    │       │   ├── crear/
    │       │   │   └── route.ts             # ✅ POST — inserta una fila en "Presupuestos_Detallados" (siempre 'Borrador')
    │       │   └── pasar-a-cuenta/
    │       │       └── route.ts             # ✅ POST — marca 'Aceptado' + inserta cargo en "Saldos" (404/409 guards)
    │       ├── galeria/
    │       │   └── subir/
    │       │       └── route.ts             # ✅ POST — inserta una fila en "Galeria_Clinica" (URL de placeholder)
    │       └── webhooks/
    │           └── pagos/
    │               └── route.ts             # Stub — webhook de pasarela de pago (Stripe/Conekta)
    │
    ├── components/
    │   ├── ui/                              # Design system compartido
    │   │   ├── ToggleSwitch.tsx             # ✅ Interruptor visual reutilizable (Tailwind puro)
    │   │   └── ToastFlotante.tsx            # ✅ Toast de éxito/error genérico (título+mensaje configurables)
    │   ├── booking/
    │   │   ├── CalendarioDisponibilidad.tsx
    │   │   └── FormularioReserva.tsx
    │   ├── medicos/
    │   │   ├── TarjetaMedico.tsx
    │   │   └── PerfilMedico.tsx
    │   ├── odontograma/                     # ✅ Módulo de Odontograma IA — persistido en Google Sheets
    │   │   ├── tipos.ts                     # Catálogos + saneamiento (sanearEstadoOdontograma)
    │   │   ├── Diente.tsx                   # SVG de una pieza con sus 5 superficies clicables
    │   │   ├── LeyendaTratamientos.tsx       # Panel lateral de tratamientos (Caries, Corona...)
    │   │   ├── PopoverSuperficie.tsx         # Popover para aplicar diagnóstico a una superficie
    │   │   ├── BuscadorPacientes.tsx         # Buscador sobre PACIENTES_DEMO (aún no sobre pacientes reales)
    │   │   ├── HistorialEvolucion.tsx        # Bitácora textual de hallazgos de la sesión
    │   │   ├── ToastGuardado.tsx             # Alerta flotante de éxito/error al guardar
    │   │   └── OdontogramaModule.tsx         # Orquestador 'use client' — estado + fetch guardar/cargar
    │   ├── pacientes/                        # ✅ Captura + Listado de Pacientes
    │   │   ├── CampoFormulario.tsx           # Campo reutilizable (label + ícono + input/textarea + error)
    │   │   ├── FormularioNuevoPaciente.tsx   # Orquestador 'use client' — estado + fetch + redirect
    │   │   ├── hallazgosClinicos.ts          # separarHallazgos() + clasificarHallazgo() (badges de la tabla)
    │   │   ├── KpisPacientes.tsx             # 3 tarjetas ejecutivas (server component, sin 'use client')
    │   │   ├── TablaPacientes.tsx            # Orquestador 'use client' — buscador + tabla clínica + 5 acciones (Odontograma/Historial/Cotizador/Galería/Saldos)
    │   │   └── BuscadorPacienteClinico.tsx   # ✅ Buscador/selector de paciente genérico (prop `baseHref`) — usado por Historial/Cotizador/Galería
    │   ├── documentos/                       # ✅ Cotizador de Presupuestos y Control de Abonos
    │   │   ├── tipos.ts                      # calcularResumenFinanciero() + ESTILOS_TIPO_MOVIMIENTO + formatearMoneda()
    │   │   ├── KpisFinancieros.tsx           # 3 tarjetas ejecutivas (server component, sin 'use client')
    │   │   ├── TablaMovimientos.tsx          # Orquestador 'use client' — tabla + botón que abre <ModalMovimiento />
    │   │   ├── ModalMovimiento.tsx           # Modal a dos columnas — captura y POST de un nuevo movimiento
    │   │   └── BuscadorPacienteFinanciero.tsx # Orquestador 'use client' — buscador/selector de paciente real
    │   ├── consultorio/                      # ✅ Mi Consultorio
    │   │   └── FormularioConsultorio.tsx     # Orquestador 'use client' — estado + fetch upsert + toast
    │   ├── correos/                          # ✅ Correos Autorizados
    │   │   ├── ListaUsuariosAutorizados.tsx  # Orquestador 'use client' — lista + botón que abre <ModalInvitarUsuario />
    │   │   └── ModalInvitarUsuario.tsx       # Modal — captura correo + rol y POST de la invitación
    │   ├── recordatorios/                    # ✅ Recordatorios de Citas
    │   │   └── MesaControlRecordatorios.tsx  # Orquestador 'use client' — toggles con auto-guardado + toast
    │   ├── historial/                        # ✅ Historial Clínico
    │   │   ├── TimelineHistorial.tsx         # Orquestador 'use client' — Timeline + botón que abre <ModalNotaEvolucion />
    │   │   └── ModalNotaEvolucion.tsx        # Formulario flotante — captura + POST de la nota de evolución
    │   ├── cotizador/                         # ✅ Cotizador de Presupuestos
    │   │   ├── tipos.ts                      # calcularTotalPresupuesto() cliente-seguro + formatearMoneda() + sugerencias
    │   │   ├── PanelCotizador.tsx             # Envoltorio 'use client' — une Constructor+Lista bajo un estado compartido
    │   │   ├── ConstructorPresupuesto.tsx    # Filas de tratamiento + subtotal/total en vivo + POST "Guardar Presupuesto"
    │   │   └── ListaPresupuestos.tsx         # Lista con badges Borrador/Aceptado + POST "Pasar a Estado de Cuenta"
    │   └── galeria/                           # ✅ Galería Clínica
    │       ├── GridGaleria.tsx               # Orquestador 'use client' — grid de tarjetas + botón que abre <ModalSubirImagen />
    │       └── ModalSubirImagen.tsx          # Modal — simula carga (descripción + tipo) y POST de la referencia
    │
    ├── hooks/
    │   ├── useDisponibilidad.ts             # Consume /api/booking/disponibilidad
    │   └── useReservarCita.ts               # Consume /api/booking/crear-cita
    │
    ├── types/
    │   └── index.ts                         # ✅ Medico, Cita, HorarioConfig, DTOs
    │
    └── utils/
        ├── googleSheets.ts                  # ✅ Cliente autenticado + helpers CRUD
        ├── medicosRepository.ts             # ✅ Acceso a datos de la pestaña "Medicos"
        ├── odontogramaRepository.ts         # ✅ Acceso a datos de la pestaña "Odontogramas"
        ├── pacientesRepository.ts           # ✅ Acceso a datos de la pestaña "Pacientes"
        ├── saldosRepository.ts              # ✅ Acceso a datos de la pestaña "Saldos" (Cotizador)
        ├── consultorioRepository.ts         # ✅ Acceso (upsert) a la pestaña "Consultorios"
        ├── usuariosAutorizadosRepository.ts # ✅ Acceso a la pestaña "Usuarios_Autorizados"
        ├── historialClinicoRepository.ts    # ✅ Acceso a la pestaña "Historiales_Clinicos" (append-only)
        ├── presupuestosRepository.ts        # ✅ Acceso a "Presupuestos_Detallados" + calcularTotalPresupuesto()
        ├── galeriaRepository.ts             # ✅ Acceso a "Galeria_Clinica" (genera URL de placeholder)
        ├── edad.ts                          # ✅ calcularEdad() + sugerirDenticionPorEdad()
        ├── validation.ts                    # ✅ Validación estricta de inputs
        └── notifications.ts                 # ✅ WhatsApp (placeholder) + Email (Resend)
```

## Principios de la arquitectura

1. **Route Groups `(public)` y `(dashboard)`**: separan layouts y lógica de autenticación
   sin afectar la URL final. El grupo `(dashboard)` es donde en el futuro se coloca el
   middleware/guard que valida `estatus_pago === 'activo'`.
2. **`src/utils/` como capa de infraestructura**: nada en `app/` habla directo con
   `googleapis`; todo pasa por `googleSheets.ts` y los repositorios (`medicosRepository.ts`).
   Esto permite migrar de Google Sheets a una base de datos real (Postgres, etc.) cambiando
   solo esta capa.
3. **`src/hooks/`**: encapsulan `fetch` hacia las API routes desde componentes cliente,
   para no repetir lógica de loading/error en cada componente.
4. **Serverless-first**: cada `route.ts` es una función independiente en Vercel. Por eso el
   endpoint de reservación no puede usar locks en memoria — la estrategia de bloqueo está
   resuelta a nivel de datos (ver comentarios en `crear-cita/route.ts`).
