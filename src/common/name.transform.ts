import { Transform } from 'class-transformer';

/**
 * Transformer que convierte texto a mayúsculas
 * Maneja múltiples palabras separadas por espacios y elimina espacios extra
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
      .map(word => word.toUpperCase())
      .join(' ');
  });
}