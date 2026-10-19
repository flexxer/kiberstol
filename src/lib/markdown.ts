import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Рендер markdown → безопасный HTML.
 *
 * Используется для richText-блоков и контентных полей (description/body),
 * которые хранятся как markdown-строки в CMS (Keystatic, `fields.text`).
 *
 * `marked` парсит markdown в HTML, `sanitize-html` убирает потенциально
 * опасные теги/атрибуты (защита от XSS при выводе через `set:html`).
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
}
