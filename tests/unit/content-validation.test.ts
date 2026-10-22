import { describe, expect, it } from 'vitest';
import {
  validateContent,
  validateImages,
  validateLineReferences,
  validateUniqueSeo,
  type ContentEntry,
} from '../../src/lib/content-validation';

const product = (overrides: Record<string, unknown> = {}): ContentEntry => ({
  file: 'src/content/products/meta-w.md',
  data: {
    title: 'Meta W',
    line: 'meta',
    price: 399,
    shortDescription: 'Игровой стол Meta W.',
    manufacturer: 'ООО МебельЛэнд М',
    manufacturerLocation: 'Республика Беларусь, Минск',
    supplier: 'ИП Суворов Александр Владимирович',
    countryOfOrigin: 'Республика Беларусь',
    image: '/assets/uploads/meta-w/image.jpg',
    content: [],
    seo: {
      title: 'Стол игровой Meta W | Kiberstol.by',
      description: 'Игровой стол Meta W с белой столешницей.',
      noindex: false,
    },
    ...overrides,
  },
});

const line = (overrides: Record<string, unknown> = {}): ContentEntry => ({
  file: 'src/content/lines/meta.md',
  data: {
    title: 'Meta',
    image: '/assets/uploads/meta/image.jpg',
    content: [],
    seo: {
      title: 'Линейка Meta | Kiberstol.by',
      description: 'Бюджетные игровые столы Meta.',
      noindex: false,
    },
    ...overrides,
  },
});

describe('validateLineReferences', () => {
  it('не находит проблем при существующей линейке', () => {
    expect(validateLineReferences([product()], new Set(['meta']))).toEqual([]);
  });

  it('сообщает о несуществующей линейке', () => {
    const issues = validateLineReferences([product({ line: 'missing' })], new Set(['meta']));

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('line');
    expect(issues[0].message).toContain('missing');
  });
});

describe('validateUniqueSeo', () => {
  it('пропускает уникальные SEO-поля', () => {
    expect(validateUniqueSeo([product(), line()])).toEqual([]);
  });

  it('находит дубликат SEO-заголовка', () => {
    const duplicate = product({
      seo: {
        title: 'Линейка Meta | Kiberstol.by',
        description: 'Другое описание.',
        noindex: false,
      },
    });

    const issues = validateUniqueSeo([line(), duplicate]);

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('seo.title');
  });

  it('находит дубликат SEO-описания', () => {
    const duplicate = product({
      seo: {
        title: 'Другой заголовок',
        description: 'Бюджетные игровые столы Meta.',
        noindex: false,
      },
    });

    const issues = validateUniqueSeo([line(), duplicate]);

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('seo.description');
  });
});

describe('validateImages', () => {
  it('пропускает существующие изображения', () => {
    expect(validateImages([product()], () => true)).toEqual([]);
  });

  it('сообщает об отсутствующем изображении', () => {
    const issues = validateImages([product()], () => false);

    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('image');
  });

  it('проверяет изображения галереи и контент-блоков', () => {
    const entry = product({
      gallery: ['/assets/uploads/meta-w/gallery/0.jpg'],
      content: [
        {
          discriminant: 'image',
          value: { image: '/assets/uploads/meta-w/extra.jpg', alt: 'Фото' },
        },
      ],
    });

    const issues = validateImages([entry], (path) => path.endsWith('image.jpg'));

    expect(issues.map((issue) => issue.field)).toEqual([
      'gallery.0',
      'content.0.image',
    ]);
  });
});

describe('validateContent', () => {
  it('возвращает пустой список для корректного контента', () => {
    const issues = validateContent(
      {
        products: [product()],
        lines: [line()],
        legal: [],
        sections: [],
        site: undefined,
      },
      () => true,
    );

    expect(issues).toEqual([]);
  });

  it('агрегирует ошибки схемы и связей', () => {
    const issues = validateContent(
      {
        products: [product({ line: 'missing', price: '399' })],
        lines: [line()],
        legal: [],
        sections: [],
        site: undefined,
      },
      () => true,
    );

    expect(issues.some((issue) => issue.field === 'price')).toBe(true);
    expect(issues.some((issue) => issue.field === 'line')).toBe(true);
  });
});
