# Входные данные после аудита — 2026-10-23

> Отчёт: [`audit-2026-10-23.md`](audit-2026-10-23.md).  
> Заполняйте только значения внутри блока ниже. Ключи и структуру не меняйте.

## Как заполнять

1. Найдите нужный ключ (например, `legal.executive_committee_phone`).
2. Заполните `value` или `decision`.
3. Поставьте `status: answered`.
4. Если ответа пока нет — оставьте `value: ""` и `status: pending`.
5. Для длинного текста используйте блок:
   ```yaml
   value: |
     Текст в несколько строк.
   ```
6. Если ответ — готовый файл, укажите `source_file: "путь/к/файлу"`.
7. **Секреты не вписывайте в этот файл.** `TG_BOT_TOKEN`, `TG_CHAT_ID`, `KEYSTATIC_SECRET`, OAuth-секреты задаются только в `.env` или панели хостинга.
8. После заполнения запустите новую задачу с промптом из [`audit-2026-10-23.md`](audit-2026-10-23.md), раздел 6.

## Заполняемый блок

```yaml
# ============================================================================
# Kiberstol.by — входные данные после аудита 2026-10-23
# ============================================================================
# Заполняйте value/decision и ставьте status: answered.
# Секреты сюда НЕ вписывать.
# ============================================================================

meta:
  audit: plans/audit-2026-10-23.md
  created: "2026-10-23"
  updated: "2026-10-24"
  status: pending
  filled_by: ""

# ----------------------------------------------------------------------------
# Юридический блок
# ----------------------------------------------------------------------------
legal:
  executive_committee_phone:
    question: "Телефон администрации Первомайского района г. Витебска"
    value: "+375 (212) 64-34-04"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: authorizedBodyPhone
      - file: src/content/legal/complaints.md
        section: "4.1"

  privacy_policy:
    question: "Какая редакция политики ПД финальная?"
    options: [current, new_text, lawyer_file]
    decision: ""
    source_file: ""
    status: pending
    apply_to:
      - file: src/content/legal/privacy.md

  privacy_telegram_wording:
    question: "Как описать передачу данных в Telegram и трансграничную передачу?"
    value: "нужно обязательно описать, что данные передаются через официальное апи телеги"
    status: answered
    apply_to:
      - file: src/content/legal/privacy.md

  returns_policy:
    question: "Финальная формулировка возврата товара надлежащего качества"
    options: [no_return_for_good_quality, 14_days, lawyer_wording]
    decision: "no_return_for_good_quality"
    source_file: ""
    status: answered
    apply_to:
      - file: src/content/legal/returns.md

  legal_address:
    question: "Юридический адрес ИП"
    value: "нужен адрес регистрации (витебск)"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: legalAddress

  complaints_book_address:
    question: "Адрес книги замечаний и предложений"
    value: "г. Минск, ул. Грушевская 17-14"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: complaintsBookAddress
      - file: src/content/legal/complaints.md
        section: "3.1"

  pickup_address:
    question: "Адрес пункта выдачи (если отличается)"
    value: "нет"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: pickupAddress

  belgie:
    question: "Номер и дата регистрации в БелГИЭ (или 'не требуется')"
    value: "не требуется"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: belgieRegistration

  email_confirmation:
    question: "Подтвердите e-mail для обращений"
    value: "kiberstol.by@gmail.com"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: email

  data_retention:
    question: "Срок хранения заявок/логов и порядок удаления"
    value: "12 месяцев"
    status: answered
    apply_to:
      - file: src/content/legal/privacy.md
      - file: docs/deployment.md

  consent_version:
    question: "Версия согласия после обновления политики"
    value: "1"
    status: answered
    apply_to:
      - file: .env.example
        field: FORM_CONSENT_VERSION
      - file: docs/deployment.md

# ----------------------------------------------------------------------------
# Коммерция
# ----------------------------------------------------------------------------
commercial:
  prices:
    question: "Реальные цены BYN по каждому SKU"
    status: pending
    items:
      meta-wb:
        price: null
        oldPrice: null
      meta-w:
        price: null
        oldPrice: null
      meta-ob:
        price: null
        oldPrice: null
      meta-s:
        price: null
        oldPrice: null
      teco-wb:
        price: null
        oldPrice: null
      teco-w:
        price: null
        oldPrice: null
      teco-ob:
        price: null
        oldPrice: null
      teco-s:
        price: null
        oldPrice: null
      tower-wb:
        price: null
        oldPrice: null
      tower-w:
        price: null
        oldPrice: null
      tower-ob:
        price: null
        oldPrice: null
      tower-s:
        price: null
        oldPrice: null
      tower-13wb:
        price: null
        oldPrice: null
      tower-13w:
        price: null
        oldPrice: null
      mwb:
        price: null
        oldPrice: null
      mw:
        price: null
        oldPrice: null
      mob:
        price: null
        oldPrice: null
      ms:
        price: null
        oldPrice: null
      m13wb:
        price: null
        oldPrice: null
      m13w:
        price: null
        oldPrice: null
    apply_to:
      - file: scripts/data/product-overrides.json
      - file: src/content/products/*.md

  delivery_tariffs:
    question: "Тарифы доставки и сборки"
    status: pending
    value:
      minsk_inside_mkad: ""
      minsk_outside_mkad: ""
      belarus_belpost: ""
      tower_surcharge: ""
      assembly: ""
    apply_to:
      - file: src/content/sections/delivery.md
      - file: src/content/legal/terms.md

  old_price_badges:
    question: "Оставляем oldPrice/бейджи только у части Meta или убираем?"
    options: [keep, remove, extend]
    decision: "keep"
    status: answered

  warranty:
    question: "Гарантия 12 месяцев подтверждена?"
    value: "12 месяцев"
    status: answered

# ----------------------------------------------------------------------------
# Контент
# ----------------------------------------------------------------------------
content:
  imba:
    question: "Что делаем с Imba?"
    options: [launch_now, later, hide]
    decision: "удалить, этой линейки не будет пока что"
    status: answered

  filters:
    question: "Нужны ли фильтры (линейка/декор/размер/допы)?"
    options: [implement_now, later, not_required]
    decision: "not_required"
    status: answered

  extra_accessories:
    question: "Заводить ли S/K/U?"
    options: [create_all, create_selected, skip]
    decision: "skip"
    selected: []
    status: answered

  telegram_link:
    question: "Ссылка/ник Telegram"
    value: "+375 29 637-76-63"
    status: answered
    apply_to:
      - file: src/content/site/settings.yaml
        field: telegram
      - file: src/pages/index.astro
        field: sameAs
      - file: src/components/layout/Footer.astro
        field: contacts

  load_capacity:
    question: "Значение нагрузки в кг или 'убрать тезис'"
    value: "убрать"
    status: answered
    apply_to:
      - file: src/content/lines/*.md
      - file: src/content/products/*.md

  line_descriptions:
    question: "Тексты описаний линеек: предоставите или сгенерировать?"
    options: [client_text, generate, keep]
    decision: "generate"
    source_file: ""
    status: answered
    apply_to:
      - file: src/content/lines/*.md

  product_descriptions:
    question: "Уникальные описания 20 карточек: предоставите или сгенерировать?"
    options: [client_text, generate, keep]
    decision: "generate"
    source_file: ""
    status: answered
    apply_to:
      - file: src/content/products/*.md

  tower_w_wb_photos:
    question: "Фото Tower W/WB: оставить от Teco или ждать свои?"
    options: [keep_teco, provide_own]
    decision: "provide_own"
    status: answered

  ms_m13_photos:
    question: "Фото Ms/M13*: оставить контекстные или ждать отдельные?"
    options: [keep_context, provide_own]
    decision: "provide_own"
    status: answered

  advantages_wording:
    question: "Как исправить тезис 'все комплектующие белорусские'?"
    value: "исправить на Беларусь, КНР"
    status: answered
    apply_to:
      - file: src/content/sections/advantages.md

# ----------------------------------------------------------------------------
# Аналитика и реклама
# ----------------------------------------------------------------------------
analytics:
  ga4_id:
    question: "Google Analytics 4 Measurement ID"
    value: ""
    status: pending
    apply_to:
      - file: src/content/site/settings.yaml
        field: analytics.ga4Id

  yandex_metrika_id:
    question: "Яндекс.Метрика ID"
    value: ""
    status: pending
    apply_to:
      - file: src/content/site/settings.yaml
        field: analytics.yandexMetrikaId

  google_ads_id:
    question: "Google Ads ID"
    value: ""
    status: pending
    apply_to:
      - file: src/content/site/settings.yaml
        field: advertising.googleAdsId

  yandex_direct_id:
    question: "Яндекс.Директ ID"
    value: ""
    status: pending
    apply_to:
      - file: src/content/site/settings.yaml
        field: advertising.yandexDirectId

  production_domain:
    question: "Production domain"
    value: "https://kiberstol.by"
    status: answered

  staging_domain:
    question: "Staging domain"
    value: "no staging"
    status: answered

# ----------------------------------------------------------------------------
# Ops и деплой
# ----------------------------------------------------------------------------
ops:
  keystatic_runtime:
    question: "Где будет работать Keystatic?"
    options: [node_on_hoster, separate_node_host, local_only, other]
    decision: "node_on_hoster"
    status: answered

  deploy_method:
    question: "Как публикуем?"
    options: [github_actions_ftp, manual_upload, other]
    decision: "github_actions_ftp"
    status: answered

  allowed_origins:
    question: "Список origin для формы"
    value: "https://kiberstol.by"
    status: answered
    apply_to:
      - file: .env.example
        field: ALLOWED_ORIGINS
      - file: docs/deployment.md

  rate_limit_dir:
    question: "Каталог rate limit на хостинге"
    value: ""
    status: pending
    apply_to:
      - file: .env.example
        field: RATE_LIMIT_DIR
      - file: docs/deployment.md

  leads_log_path:
    question: "Путь к логу заявок вне webroot (или пусто)"
    value: "no need"
    status: answered
    apply_to:
      - file: .env.example
        field: LEADS_LOG_PATH
      - file: docs/deployment.md

  security_headers:
    question: "Добавляем .htaccess с security/caching headers?"
    options: [yes, no, hoster_panel]
    decision: "hoster_panel"
    status: answered

  monitoring:
    question: "Нужен uptime/error мониторинг?"
    options: [yes, no]
    decision: "no"
    status: answered

# ----------------------------------------------------------------------------
# Секреты — только для справки, значения сюда не вписывать
# ----------------------------------------------------------------------------
secrets:
  note: "Секреты сюда не вписывать. Задаются в .env или панели хостинга."
  required:
    - TG_BOT_TOKEN
    - TG_CHAT_ID
    - KEYSTATIC_GITHUB_CLIENT_ID
    - KEYSTATIC_GITHUB_CLIENT_SECRET
    - KEYSTATIC_SECRET
  status: pending
```
