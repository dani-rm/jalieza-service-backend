import { BadRequestException } from '@nestjs/common';

export const validateBirthDate = (birthDate: Date): Date => {
  if (!birthDate) return null;

  const localDate = new Date(birthDate);

  // Validar que la fecha sea válida
  if (isNaN(localDate.getTime())) {
    throw new BadRequestException('Fecha de nacimiento inválida');
  }

  // Validar que no sea una fecha futura
  if (localDate > new Date()) {
    throw new BadRequestException('La fecha de nacimiento no puede ser futura');
  }

  // Validar que no sea una fecha muy antigua (más de 150 años)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 150);
  if (localDate < minDate) {
    throw new BadRequestException(
      'La fecha de nacimiento no puede ser anterior a 150 años',
    );
  }

  // Normalizar a solo fecha (sin hora, minutos, segundos)
  const normalizedDate = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
  );

  return normalizedDate;
};

export const formatDateOnly = (date: Date | string | null): string | null => {
  if (!date) return null;

  // Convertir string a Date si es necesario
  if (typeof date === 'string') {
    // Si ya viene en formato YYYY-MM-DD, devolverlo tal cual para evitar desfases
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// ✅ CALCULAR EDAD
export const calculateAge = (
  birthDate: Date | string | null,
): number | null => {
  if (!birthDate) return null;

  // Convertir string a Date si es necesario
  let birth: Date;
  if (typeof birthDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [y, m, d] = birthDate.split('-').map(Number);
      birth = new Date(y, m - 1, d);
    } else {
      birth = new Date(birthDate);
    }
    if (isNaN(birth.getTime())) return null;
  } else {
    birth = birthDate;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};
