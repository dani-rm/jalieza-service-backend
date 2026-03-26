export const ERROR_MESSAGES = {
  CITIZEN: {
    NOT_FOUND: (id: number) => `Ciudadano con id ${id} no encontrado`,
    ALREADY_EXISTS: 'Ya existe un ciudadano con estos datos',
    INVALID_BIRTH_DATE: 'Fecha de nacimiento inválida',
    FUTURE_BIRTH_DATE: 'La fecha de nacimiento no puede ser futura',
    TOO_OLD_BIRTH_DATE:
      'La fecha de nacimiento no puede ser anterior a 150 años',
    MARRIED_WITHOUT_PARTNER:
      'Si el estado civil es casado, debe especificar una pareja',
    PARTNER_NOT_FOUND: (id: number) => `Pareja con id ${id} no encontrada`,
    PARTNER_ALREADY_MARRIED: (name: string, lastName: string) =>
      `La persona seleccionada ya está casada con ${name} ${lastName}`,
    CANNOT_MARRY_SELF: 'Un ciudadano no puede ser pareja de sí mismo',
    PARTNER_CHANGE_REQUIRES_PARTNER:
      'Si cambia a casado, debe especificar una pareja',
  },
  VALIDATION: {
    SEARCH_MIN_LENGTH: 'La búsqueda debe tener al menos 2 caracteres',
  },
} as const;
