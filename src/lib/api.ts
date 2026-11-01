import { NextResponse } from 'next/server';

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function authUnavailable() {
  return fail('Configurá DATABASE_URL y JWT_SECRET para habilitar cuentas y favoritos.', 503);
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
