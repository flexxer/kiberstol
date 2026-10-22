import { describe, expect, it } from 'vitest';
import {
  contentBlocks,
  legalSchema,
  linesSchema,
  productsSchema,
  sectionsSchema,
  siteSchema,
} from '../../src/lib/content-schemas';

const validProduct = {
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
};

describe('productsSchema', () => {
  it('принимает корректный товар', () => {
    const result = productsSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('требует юридически обязательные поля', () => {
    const { manufacturer, ...withoutManufacturer } = validProduct;
    const result = productsSchema.safeParse(withoutManufacturer);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('manufacturer'))).toBe(true);
    }
  });

  it('требует цену числом', () => {
    const result = productsSchema.safeParse({ ...validProduct, price: '399' });
    expect(result.success).toBe(false);
  });

  it('по умолчанию used = false и order = 0', () => {
    const result = productsSchema.parse(validProduct);
    expect(result.used).toBe(false);
    expect(result.order).toBe(0);
  });
});

describe('linesSchema', () => {
  it('принимает корректную линейку', () => {
    const result = linesSchema.safeParse({
      title: 'Meta',
      image: '/assets/uploads/meta/image.jpg',
      features: ['Размер: 1200 * 830 мм'],
      content: [],
      seo: {
        title: 'Линейка Meta | Kiberstol.by',
        description: 'Бюджетные игровые столы Meta.',
        noindex: false,
      },
    });

    expect(result.success).toBe(true);
  });

  it('требует изображение линейки', () => {
    const result = linesSchema.safeParse({ title: 'Meta', content: [] });
    expect(result.success).toBe(false);
  });
});

describe('contentBlocks', () => {
  it('принимает блок richText в формате { discriminant, value }', () => {
    const result = contentBlocks.safeParse([
      { discriminant: 'richText', value: { content: '**Текст**' } },
    ]);

    expect(result.success).toBe(true);
  });

  it('принимает вложенные блоки columns', () => {
    const result = contentBlocks.safeParse([
      {
        discriminant: 'columns',
        value: {
          columns: [
            {
              heading: 'Колонка',
              content: [{ discriminant: 'richText', value: { content: 'Текст' } }],
            },
          ],
        },
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('отклоняет неизвестный дискриминант', () => {
    const result = contentBlocks.safeParse([
      { discriminant: 'unknown', value: {} },
    ]);

    expect(result.success).toBe(false);
  });

  it('требует alt для изображения', () => {
    const result = contentBlocks.safeParse([
      { discriminant: 'image', value: { image: '/assets/uploads/a.jpg' } },
    ]);

    expect(result.success).toBe(false);
  });
});

describe('sectionsSchema', () => {
  it('принимает advantages без value', () => {
    const result = sectionsSchema.safeParse({
      title: 'Преимущества',
      heading: 'Почему Kiberstol',
      content: [],
      variant: { discriminant: 'advantages' },
      order: 1,
    });

    expect(result.success).toBe(true);
  });

  it('принимает contact без value', () => {
    const result = sectionsSchema.safeParse({
      title: 'Контакты',
      heading: 'Оставить заявку',
      content: [],
      variant: { discriminant: 'contact' },
      order: 6,
    });

    expect(result.success).toBe(true);
  });

  it('требует items для faq', () => {
    const result = sectionsSchema.safeParse({
      title: 'FAQ',
      heading: 'Частые вопросы',
      content: [],
      variant: { discriminant: 'faq', value: {} },
      order: 5,
    });

    expect(result.success).toBe(true);
  });
});

describe('siteSchema', () => {
  it('подставляет подписи интерфейса по умолчанию', () => {
    const result = siteSchema.parse({
      brand: 'Kiberstol.by',
      tagline: 'Игровые столы',
      fullName: 'ИП Суворов Александр Владимирович',
      unp: '391946770',
      registrationDate: '14.04.2025',
      tradeRegistryNumber: '765426',
      tradeRegistryDate: '30.12.2025',
      phone: '+375 29 637-76-63',
      email: 'kiberstol.by@gmail.com',
      address: 'г. Минск',
      workHours: '9:00–21:00',
      authorizedBody: 'ИП Суворов Александр Владимирович',
      authorizedBodyPhone: '+375 212 XX-XX-XX',
      labels: {},
      nav: [{ label: 'Главная', href: '/' }],
    });

    expect(result.labels?.specs).toBe('Характеристики');
    expect(result.labels?.cookieSettings).toBe('Настройки cookie');
  });
});

describe('legalSchema', () => {
  it('приводит дату обновления к Date', () => {
    const result = legalSchema.parse({
      title: 'Политика конфиденциальности',
      updatedAt: '2026-10-18',
      seo: {
        title: 'Политика конфиденциальности',
        description: 'Политика обработки персональных данных.',
        noindex: true,
      },
    });

    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});
