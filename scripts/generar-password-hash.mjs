#!/usr/bin/env node
/**
 * Genera un hash bcrypt para pegar en la columna O ("password_hash") de la
 * pestaña "Medicos", en la fila del médico correspondiente.
 *
 * Uso:
 *   npm run generar:password-hash -- "la-contraseña-del-medico"
 *
 * El hash resultante empieza con "$2a$" o "$2b$" — `src/utils/password.ts`
 * lo detecta automáticamente y lo compara con bcrypt (en vez del camino de
 * texto plano, que es solo para pruebas).
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run generar:password-hash -- "la-contraseña-del-medico"');
  process.exitCode = 1;
} else {
  const hash = bcrypt.hashSync(password, 10);
  console.log('\nPega este valor en la columna O (password_hash) de la fila del médico:\n');
  console.log(hash);
  console.log('');
}
