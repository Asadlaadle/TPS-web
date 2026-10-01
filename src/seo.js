const buildEnvironment = typeof process === 'undefined' ? {} : process.env;
export const SITE_ORIGIN = (buildEnvironment.SITE_URL || 'https://demo.example.invalid').replace(/\/+$/, '');
export const SITE_NAME = 'Independent School Website Preview';
export const DEMO_INFORMATION_PATH = '/demo-information/';
export const DEMO_ACCESS_PATH = '/demo-access/';

const DEMO_METADATA = {
  information: {
    title: 'Important Document: Demo Notice | Takshashila School Preview',
    description: 'Important notice: this independent static preview has no accounts, sign-ups, payments, forms, analytics or database. Its host may process basic request logs.',
  },
  blocked: {
    title: 'Demo Only: Action Unavailable | School Website Preview',
    description: 'This independent demo does not allow account access, registrations, sign-ups, payments or submission of personal information.',
  },
};

const PAGE_METADATA = {
  '/': {
    title: 'Independent School Website Preview',
    description: 'Independent static preview with sample school content, no contact details, and illustrative CC0 stock imagery.',
  },
  'meet-the-director': {
    title: 'Vice Chairperson’s Message | Takshashila Public School',
    description: 'Read a message from the Vice Chairperson of Takshashila Public School, Shahjahanpur, and learn about the school’s educational outlook.',
  },
  curriculum: {
    title: 'Cultural Activities | Takshashila Public School',
    description: 'Explore cultural celebrations, performances and co-curricular activities at Takshashila Public School in Shahjahanpur.',
  },
  'academic-calendar': {
    title: 'Academic Overview | Takshashila Public School',
    description: 'Learn about the academic approach and learning programme at Takshashila Public School, Shahjahanpur.',
  },
  result: {
    title: 'CBSE Results | Takshashila Public School',
    description: 'View Class 10 and Class 12 CBSE examination results and year-wise result information from Takshashila Public School.',
  },
  'alumni-registration': {
    title: 'Notable Alumni | Takshashila Public School',
    description: 'Meet notable Takshashila Public School alumni and find information about registering as a member of the alumni community.',
  },
  'our-campus': {
    title: 'Student Leadership | Takshashila Public School',
    description: 'Discover student leadership opportunities and how Takshashila Public School helps students develop responsibility and initiative.',
  },
  transportation: {
    title: 'Student Transportation | Takshashila Public School',
    description: 'Read about the school transportation facilities and student travel arrangements at Takshashila Public School, Shahjahanpur.',
  },
  laboratory: {
    title: 'Laboratories | Takshashila Public School',
    description: 'Explore the laboratory facilities at Takshashila Public School and the hands-on learning opportunities they support.',
  },
  'school-library': {
    title: 'School Library | Takshashila Public School',
    description: 'Find out about the library, reading resources and study environment at Takshashila Public School, Shahjahanpur.',
  },
  'computer-lab': {
    title: 'Computer Laboratory | Takshashila Public School',
    description: 'Explore computer laboratory facilities and digital learning at Takshashila Public School in Shahjahanpur.',
  },
  sports: {
    title: 'Sports and Games | Takshashila Public School',
    description: 'Discover sports, games, competitions and physical education at Takshashila Public School, Shahjahanpur.',
  },
  music: {
    title: 'Music and Performing Arts | Takshashila Public School',
    description: 'Explore music and performing arts learning at Takshashila Public School, including opportunities for creative expression.',
  },
  'swimming-pool': {
    title: 'Swimming Pool | Takshashila Public School',
    description: 'Learn about swimming and aquatic facilities at Takshashila Public School in Shahjahanpur.',
  },
  'fee-details': {
    title: 'Welcome to Takshashila Public School',
    description: 'Welcome to Takshashila Public School, Shahjahanpur. Find school information and useful links for current and prospective families.',
  },
  'about-us': {
    title: 'About the School | Takshashila Public School',
    description: 'Get an overview of Takshashila Public School in Shahjahanpur and explore its school, admissions and campus information.',
  },
  'about-school': {
    title: 'Discover Takshashila Public School | Shahjahanpur',
    description: 'Discover Takshashila Public School, Shahjahanpur: its background, educational outlook, campus and school community.',
  },
  admission: {
    title: 'Admissions | Takshashila Public School',
    description: 'Explore admissions at Takshashila Public School, Shahjahanpur, including the admission process, fee information and application resources.',
  },
  mission: {
    title: 'Our Mission | Takshashila Public School',
    description: 'Read the mission of Takshashila Public School and its commitment to helping students become capable, versatile citizens.',
  },
  academic: {
    title: 'Academics | Takshashila Public School',
    description: 'Find academic information for Takshashila Public School, including the academic overview and CBSE examination results.',
  },
  'admission-enquiry': {
    title: 'Admission Process | Takshashila Public School',
    description: 'Review the admission steps at Takshashila Public School, Shahjahanpur, and contact the school about an application enquiry.',
  },
  vision: {
    title: 'School Achievements | Takshashila Public School',
    description: 'Learn about the achievements, student development and learning facilities highlighted by Takshashila Public School.',
  },
  examination: {
    title: 'Extracurricular Activities | Takshashila Public School',
    description: 'Explore extracurricular opportunities at Takshashila Public School, including cultural activities and sports.',
  },
  'admission-overview': {
    title: 'Fee Structure and Eligibility | Takshashila Public School',
    description: 'Find fee structure and admission eligibility information for Takshashila Public School, Shahjahanpur.',
  },
  'student-registration': {
    title: 'Book List | Takshashila Public School',
    description: 'Access the school book-list information provided by Takshashila Public School, Shahjahanpur.',
  },
  'transfer-certificate': {
    title: 'Transfer Certificate | Takshashila Public School',
    description: 'Find transfer certificate information and the school’s instructions for Takshashila Public School students.',
  },
  downloads: {
    title: 'Student Life and Resources | Takshashila Public School',
    description: 'Explore student life information and school resources available from Takshashila Public School, Shahjahanpur.',
  },
  'mandatory-disclosure': {
    title: 'Mandatory Public Disclosure | Takshashila Public School',
    description: 'Read Takshashila Public School’s mandatory public disclosure, including school details, affiliation information and required documents.',
  },
  gallery: {
    title: 'School Gallery | Takshashila Public School',
    description: 'Browse photographs of sports, assembly and class activities at Takshashila Public School, Shahjahanpur.',
  },
  'contact-us': {
    title: 'Contact and Directions | Takshashila Public School',
    description: 'Sample contact page for an independent school website preview. No phone number or personal contact details are published.',
  },
  'meet-the-chairman': {
    title: 'Campus Infrastructure | Takshashila Public School',
    description: 'Explore the campus infrastructure and facilities at Takshashila Public School, Shahjahanpur.',
  },
};

export function getPageMetadata(page = {}, slug = page.linkname || '/') {
  if (slug === 'demo-information') {
    return { ...DEMO_METADATA.information, canonical: `${SITE_ORIGIN}${DEMO_INFORMATION_PATH}`, image: `${SITE_ORIGIN}/assets/school/classroom.webp`, type: 'website' };
  }
  if (slug === 'demo-access') {
    return { ...DEMO_METADATA.blocked, canonical: `${SITE_ORIGIN}${DEMO_ACCESS_PATH}`, image: `${SITE_ORIGIN}/assets/school/classroom.webp`, type: 'website', robots: 'noindex,nofollow' };
  }
  const metadata = PAGE_METADATA[slug] || PAGE_METADATA['/'];
  const canonicalPath = slug === '/' ? '/' : `/page/${encodeURIComponent(slug)}/`;
  return {
    title: metadata.title,
    description: metadata.description,
    canonical: `${SITE_ORIGIN}${canonicalPath}`,
    image: `${SITE_ORIGIN}/assets/school/classroom.webp`,
    type: 'website',
  };
}

export const CMS_SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math', 'video', 'audio', 'source'],
  FORBID_ATTR: ['style', 'class', 'id', 'srcset', 'srcdoc', 'formaction', 'autofocus'],
  ALLOW_DATA_ATTR: false,
};

export const SEO_ROUTE_SLUGS = Object.keys(PAGE_METADATA).filter((slug) => slug !== '/');

export function sanitizeCmsHtml(html, purifier = globalThis.DOMPurify) {
  if (!purifier?.sanitize) return '';
  return purifier.sanitize(String(html || ''), CMS_SANITIZE_OPTIONS);
}

const SENSITIVE_DESTINATION_PATTERN = /(?:payment|checkout|pay[-_/ ]?now|sign[-_ ]?up|create[-_ ]?account|register[-_ ]?account|registration[-_/ ]?form|admission[-_/ ]?form|online[-_/ ]?application|\/login(?:\/|$)|\/portal(?:\/|$))/i;

export function isSensitiveDestination(href, label = '') {
  if (!href) return false;
  try {
    const url = new URL(href, SITE_ORIGIN);
    if (url.hostname === 'avp.schoolaxis.in' || url.hostname === 'avp.santosh.cloudcampus.tech') return true;
    return SENSITIVE_DESTINATION_PATTERN.test(`${url.pathname} ${url.search} ${label}`);
  } catch {
    return SENSITIVE_DESTINATION_PATTERN.test(`${href} ${label}`);
  }
}

export function normalizeCmsHeadings(container) {
  if (!container) return;
  for (const heading of container.querySelectorAll('h1')) {
    const replacement = container.ownerDocument.createElement('h2');
    replacement.append(...heading.childNodes);
    heading.replaceWith(replacement);
  }
}