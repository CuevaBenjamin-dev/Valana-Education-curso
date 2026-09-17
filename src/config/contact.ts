/** El número definitivo se configura durante el build; nunca se distribuye entre componentes. */
export const contact = {
  whatsappNumber: import.meta.env.PUBLIC_WHATSAPP_NUMBER || '',
  defaultMessage:
    'Hola, vi el curso de Inteligencia Artificial y Digitalización para el Trabajo y los Negocios y quisiera recibir más información.',
};

/** Número internacional de 8–15 cifras, con + inicial, espacios o guiones opcionales. */
export function buildWhatsAppUrl(number: string, message: string): string | null {
  const normalized = number.trim().replace(/[\s-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) return null;

  const digits = normalized.replace(/^\+/, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const whatsappUrl = buildWhatsAppUrl(contact.whatsappNumber, contact.defaultMessage);
