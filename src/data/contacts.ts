export const contacts = {
  email: {
    href: 'mailto:skzairov@gmail.com',
    value: 'skzairov@gmail.com',
  },
  whatsapp: {
    href: 'https://wa.me/996706330633',
    value: '+996 706 330 633',
  },
  telegram: {
    href: 'https://t.me/zairov_kg',
    value: '@zairov_kg',
  },
} as const;

export const caseLayouts = {
  ustamaster: 'feature',
  yogamammy: 'split',
  toloykon: 'split',
  hidden: 'wide',
  fitness: 'compact',
} as const;

export type CaseId = keyof typeof caseLayouts;
