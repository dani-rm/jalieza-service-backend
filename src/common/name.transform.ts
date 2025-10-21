import { Transform } from 'class-transformer';

/**
 * Transformer que convierte texto a formato título (Primera letra mayúscula, resto minúsculas)
 * Maneja múltiples palabras separadas por espacios
 */
export function NameTransform() {
  return Transform(({ value }) => {
    if (!value || typeof value !== 'string') {
      return value;
    }
    
    return value
      .trim()
      .split(' ')
      .filter(word => word.length > 0) // Elimina espacios extra
      .map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');
  });
}