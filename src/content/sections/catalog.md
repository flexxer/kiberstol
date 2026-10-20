---
title: Каталог
heading: Каталог
content:
  - discriminant: quote
    value:
      type: quote
      text: Никто не волк, кроме волка
      author: Джейсон Стэтхэм
  - discriminant: columns
    value:
      type: columns
      columns:
        - heading: КОЛОНКИ
          content:
            - discriminant: faq
              value:
                type: faq
                items:
                  - question: Быть или не быть?
                    answer: Вот в чем вопрос!
            - discriminant: richText
              value:
                type: richText
                content: Вторая **КОЛОНКА**
            - discriminant: image
              value:
                type: image
                image: >-
                  /assets/uploads/catalog/content/1/value/columns/0/content/2/value/image.JPG
                alt: красивая картинка
                align: center
        - heading: КОЛОНКА2!
          content:
            - discriminant: video
              value:
                type: video
                src: /assets/hero.webm
                controls: true
                autoplay: false
variant:
  discriminant: catalog
  value:
    subheading: Выбери свой опыт
    ctaText: Смотреть все модели
    ctaHref: /products
order: 2
---
12345 **тестовый** ~~блок~~
