/** Contenido editorial del curso. Las condiciones pendientes deben confirmarse antes de publicar. */
export const course = {
  title: 'Inteligencia Artificial y Digitalización para el Trabajo y los Negocios',
  shortTitle: 'IA y Digitalización',
  description:
    'Aprende desde cero a utilizar inteligencia artificial y herramientas digitales para ahorrar tiempo, organizar información y resolver tareas reales de tu trabajo o negocio.',
};

export const instructor = {
  name: 'Benjamín Cueva',
  role: 'Desarrollador de IA y Automatización en una empresa del rubro textil.',
  bio: 'Trabajo aplicando desarrollo de software, inteligencia artificial, automatización y herramientas digitales a procesos reales. El enfoque del curso parte precisamente de esa idea: utilizar la tecnología de forma práctica y comprensible para resolver trabajo real.',
  portrait: {
    // Colocar el archivo en public/images/ y reemplazar por su ruta pública.
    // Ejemplo: '/images/benjamin-cueva.webp'. Vacío conserva el placeholder.
    src: '',
    alt: 'Fotografía de Benjamín Cueva',
    width: 800,
    height: 1000,
  },
};

export const problemItems = [
  {
    number: '01',
    title: 'Otra vez la misma tarea.',
    description: 'Copiar, ordenar y repetir procesos administrativos que consumen parte de tu día.',
  },
  {
    number: '02',
    title: 'Todo empieza en blanco.',
    description: 'Correos, documentos y propuestas que tienes que redactar desde cero.',
  },
  {
    number: '03',
    title: 'La información está. Pero dónde.',
    description: 'Archivos dispersos, hojas de cálculo y datos que cuesta convertir en algo útil.',
  },
  {
    number: '04',
    title: 'Tienes IA. Falta el cómo.',
    description: 'Conoces las herramientas, pero no sabes cómo llevarlas a un problema concreto.',
  },
];

export const outcomes = [
  {
    number: '01',
    title: 'Pedir mejor. Obtener algo útil.',
    description: 'Comunicar tus objetivos a una IA con contexto, instrucciones claras y criterios para revisar la respuesta.',
  },
  {
    number: '02',
    title: 'Trabajar con documentos.',
    description: 'Explorar cómo resumir, redactar y estructurar información para tareas de tu trabajo o negocio.',
  },
  {
    number: '03',
    title: 'Darle sentido a tus datos.',
    description: 'Organizar información y acercarte al análisis de datos con apoyo de herramientas digitales.',
  },
  {
    number: '04',
    title: 'Pensar en procesos digitales.',
    description: 'Comprender qué significa digitalizar una tarea y reconocer dónde puede aportar valor.',
  },
  {
    number: '05',
    title: 'Detectar lo automatizable.',
    description: 'Identificar tareas repetitivas y distinguir qué pasos necesitan criterio y revisión humana.',
  },
  {
    number: '06',
    title: 'Llevarlo a un caso real.',
    description: 'Conectar lo aprendido con problemas concretos del trabajo y los negocios.',
  },
];

/** Propuesta inicial de contenidos: editar títulos, temas y duración al confirmar el programa. */
export const sessions = [
  {
    number: '01',
    title: 'Entender y dirigir la IA',
    description: 'Un punto de partida claro para utilizar IA con intención y evaluar lo que te devuelve.',
    topics: ['Qué puede aportar la IA a una tarea', 'Contexto e instrucciones claras', 'Revisión de respuestas y límites'],
    duration: 'Por definir',
  },
  {
    number: '02',
    title: 'Documentos e información',
    description: 'De información dispersa a documentos que te ayuden a avanzar en tu trabajo.',
    topics: ['Redacción y estructura de documentos', 'Síntesis y organización de información', 'Criterios para revisar resultados'],
    duration: 'Por definir',
  },
  {
    number: '03',
    title: 'Datos y herramientas digitales',
    description: 'Organizar datos y comprender cómo una tarea puede convertirse en un proceso digital.',
    topics: ['Organización de datos', 'Herramientas para tareas laborales', 'Reconocimiento de tareas automatizables'],
    duration: 'Por definir',
  },
  {
    number: '04',
    title: 'Aplicación a casos reales',
    description: 'Conectar las herramientas con un problema concreto y revisar el resultado de la práctica.',
    topics: ['Definición de un problema de trabajo', 'Selección y aplicación de herramientas', 'Revisión del resultado y próximos pasos'],
    duration: 'Por definir',
  },
];

export const methodology = [
  {
    number: '01',
    title: 'Problema',
    description: 'Partimos de una tarea concreta del trabajo o de un negocio.',
  },
  {
    number: '02',
    title: 'Demostración',
    description: 'Vemos cómo abordar la tarea con IA y herramientas digitales.',
  },
  {
    number: '03',
    title: 'Práctica',
    description: 'Aplicamos el proceso y ajustamos las instrucciones.',
  },
  {
    number: '04',
    title: 'Resultado',
    description: 'Revisamos lo obtenido y cómo llevarlo al trabajo real.',
  },
];

export const courseInfo: { label: string; value: string; pending?: boolean }[] = [
  { label: 'Modalidad', value: 'Por definir', pending: true },
  { label: 'Nivel', value: 'Desde cero · introductorio' },
  { label: 'Número de sesiones', value: '4 sesiones propuestas' },
  { label: 'Duración', value: 'Por definir', pending: true },
  { label: 'Fecha de inicio', value: 'Por definir', pending: true },
  { label: 'Horario', value: 'Por definir', pending: true },
  { label: 'Inversión', value: 'Por definir', pending: true },
  { label: 'Incluye', value: 'Por confirmar', pending: true },
  { label: 'Canal de contacto', value: 'WhatsApp' },
];

export const faq = [
  {
    id: 'conocimientos-ia',
    question: '¿Necesito saber de inteligencia artificial?',
    answer: 'El curso está planteado para comenzar desde cero. El objetivo es entender cómo utilizar la IA de forma práctica en tareas del trabajo o de un negocio.',
  },
  {
    id: 'programacion',
    question: '¿Necesito conocimientos de programación?',
    answer: 'El enfoque inicial es utilizar inteligencia artificial y herramientas digitales de forma comprensible. Los requisitos específicos de cada práctica se confirmarán con el programa definitivo.',
  },
  {
    id: 'dirigido',
    question: '¿A quién está dirigido?',
    answer: 'A personas que quieran aplicar IA y digitalización a su trabajo o negocio: organizar información, trabajar con documentos y reconocer tareas que podrían simplificarse.',
  },
  {
    id: 'requisitos',
    question: '¿Qué necesito para participar?',
    answer: 'Los requisitos de equipo, conexión y acceso a herramientas se confirmarán junto con la modalidad y el programa. Esa información estará disponible antes de la inscripción.',
  },
  {
    id: 'informacion',
    question: '¿Cómo recibo información sobre el curso?',
    answer: 'El canal previsto es WhatsApp. Cuando esté habilitado, los botones de información abrirán una conversación con un mensaje preparado que podrás revisar antes de enviarlo.',
  },
  {
    id: 'practica',
    question: '¿Las clases son prácticas?',
    answer: 'Ese es el enfoque del curso: partir de un problema, observar una demostración, practicar y revisar el resultado. Los ejercicios se concretarán en el programa definitivo.',
  },
];
