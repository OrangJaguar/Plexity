export const PROFILE_VERSION = 1;

export function emptyProfileDocument() {
  return {
    version: PROFILE_VERSION,
    header: {
      photoDataUrl: null,
      name: '',
      headline: '',
      bioShort: '',
    },
    highlights: [],
    basicInfo: {
      location: '',
      school: '',
      educationStatus: '',
      graduationYear: '',
      ageRange: '',
      descriptors: [],
    },
    about: '',
    interests: [],
    education: [],
    experiences: [],
    links: [],
    currentFocus: '',
    updatedAt: Date.now(),
  };
}

export function newHighlight(partial = {}) {
  return {
    id: crypto.randomUUID(),
    label: partial.label || '',
    value: partial.value || '',
    order: partial.order ?? Date.now(),
  };
}

export function newEducationEntry(partial = {}) {
  return {
    id: crypto.randomUUID(),
    school: partial.school || '',
    program: partial.program || '',
    focus: partial.focus || '',
    graduationYear: partial.graduationYear || '',
    coursework: partial.coursework || '',
    certifications: partial.certifications || '',
    notes: partial.notes || '',
    order: partial.order ?? Date.now(),
  };
}

export function newExperience(partial = {}) {
  return {
    id: crypto.randomUUID(),
    title: partial.title || '',
    descriptor: partial.descriptor || '',
    timeframe: partial.timeframe || '',
    link: partial.link || '',
    description: partial.description || '',
    order: partial.order ?? Date.now(),
  };
}

export function newProfileLink(partial = {}) {
  return {
    id: crypto.randomUUID(),
    label: partial.label || '',
    url: partial.url || '',
    order: partial.order ?? Date.now(),
  };
}

export function normalizeProfileDocument(data) {
  const base = emptyProfileDocument();
  if (!data || typeof data !== 'object') return base;

  return {
    version: PROFILE_VERSION,
    header: {
      ...base.header,
      ...(data.header || {}),
      photoDataUrl: data.header?.photoDataUrl || null,
    },
    highlights: Array.isArray(data.highlights)
      ? data.highlights.map(normalizeHighlight).sort((a, b) => a.order - b.order)
      : [],
    basicInfo: {
      ...base.basicInfo,
      ...(data.basicInfo || {}),
      descriptors: Array.isArray(data.basicInfo?.descriptors)
        ? data.basicInfo.descriptors.filter(Boolean)
        : [],
    },
    about: data.about || '',
    interests: Array.isArray(data.interests) ? data.interests.filter(Boolean) : [],
    education: Array.isArray(data.education)
      ? data.education.map(normalizeEducation).sort((a, b) => a.order - b.order)
      : [],
    experiences: Array.isArray(data.experiences)
      ? data.experiences.map(normalizeExperience).sort((a, b) => a.order - b.order)
      : [],
    links: Array.isArray(data.links)
      ? data.links.map(normalizeLink).sort((a, b) => a.order - b.order)
      : [],
    currentFocus: data.currentFocus || '',
    updatedAt: data.updatedAt || Date.now(),
  };
}

function normalizeHighlight(h) {
  return {
    id: h.id || crypto.randomUUID(),
    label: h.label || '',
    value: h.value || '',
    order: typeof h.order === 'number' ? h.order : Date.now(),
  };
}

function normalizeEducation(e) {
  return {
    id: e.id || crypto.randomUUID(),
    school: e.school || '',
    program: e.program || '',
    focus: e.focus || '',
    graduationYear: e.graduationYear || '',
    coursework: e.coursework || '',
    certifications: e.certifications || '',
    notes: e.notes || '',
    order: typeof e.order === 'number' ? e.order : Date.now(),
  };
}

function normalizeExperience(e) {
  return {
    id: e.id || crypto.randomUUID(),
    title: e.title || '',
    descriptor: e.descriptor || '',
    timeframe: e.timeframe || '',
    link: e.link || '',
    description: e.description || '',
    order: typeof e.order === 'number' ? e.order : Date.now(),
  };
}

function normalizeLink(l) {
  return {
    id: l.id || crypto.randomUUID(),
    label: l.label || '',
    url: l.url || '',
    order: typeof l.order === 'number' ? l.order : Date.now(),
  };
}

export function parseTagInput(raw) {
  return (raw || '')
    .split(/[,]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export const LINK_PRESETS = [
  { label: 'Website', placeholder: 'https://yoursite.com' },
  { label: 'GitHub', placeholder: 'https://github.com/username' },
  { label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { label: 'Portfolio', placeholder: 'https://…' },
];

export const HIGHLIGHT_SUGGESTIONS = [
  { label: 'Current focus', value: '' },
  { label: 'Main project', value: '' },
  { label: 'Target path', value: '' },
  { label: 'Key role', value: '' },
];

export function sectionHasContent(section, doc) {
  switch (section) {
    case 'highlights':
      return doc.highlights.some((h) => h.label || h.value);
    case 'basic':
      return Object.values(doc.basicInfo).some((v) => (
        Array.isArray(v) ? v.length > 0 : Boolean(v)
      ));
    case 'about':
      return Boolean(doc.about?.trim());
    case 'interests':
      return doc.interests.length > 0;
    case 'education':
      return doc.education.some((e) => e.school || e.program);
    case 'experiences':
      return doc.experiences.some((e) => e.title);
    case 'links':
      return doc.links.some((l) => l.url);
    case 'focus':
      return Boolean(doc.currentFocus?.trim());
    default:
      return false;
  }
}

export async function resizePhotoFile(file, maxSize = 320) {
  if (!file?.type?.startsWith('image/')) return null;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (typeof document === 'undefined') return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
