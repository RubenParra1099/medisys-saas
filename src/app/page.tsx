export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-primary">MediSys</h1>
      <p className="max-w-md text-gray-600">
        Encuentra médicos y agenda tu cita en tiempo real. Este es el punto de partida del
        directorio público — construye aquí la búsqueda y las tarjetas de médicos
        (`src/components/medicos`).
      </p>
    </main>
  );
}
