/** Evita publicar URLs canónicas o sociales con un dominio de ejemplo. */
function publicSiteUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export const site = {
  name: 'ESCS',
  title: 'Curso de IA y Digitalización para el Trabajo y los Negocios | ESCS',
  description:
    'Aprende desde cero a utilizar inteligencia artificial y herramientas digitales en tareas reales de tu trabajo o negocio. Curso con Benjamín Cueva.',
  url: publicSiteUrl(import.meta.env.PUBLIC_SITE_URL),
  ogImage: '/og-course.png',
};
