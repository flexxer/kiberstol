<?php

/**
 * submit.php — приём заявок формы заказа → Telegram Bot API.
 *
 * Контракт: docs/forms.md (§2–§7). Решение по транспорту: plans/adr-002-form-transport.md.
 *
 * Безопасность:
 *  - Origin/Referer сверяются с ALLOWED_ORIGINS;
 *  - honeypot `website`;
 *  - тайминг `elapsed` (3000…86400000 мс), `ts` — legacy fallback;
 *  - обязательное согласие `consent-pd`, `marketing-consent` фиксируется;
 *  - rate limit по IP и хешу телефона (flock, очистка старых файлов);
 *  - Telegram: cURL с fallback на file_get_contents, парсинг `ok`.
 *
 * Секреты читаются только из окружения через getenv() и никогда не логируются.
 * TG_DRY_RUN=1 — валидация + лог + 200 {ok:true,dryRun:true} без Telegram.
 */

declare(strict_types=1);

const FORM_MIN_ELAPSED_MS = 3000;
const FORM_MAX_ELAPSED_MS = 86400000;
const RATE_LIMIT_WINDOW = 600;
const RATE_LIMIT_IP = 5;
const RATE_LIMIT_PHONE = 3;
const RATE_FILE_PREFIX = 'kiberstol-rate-';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/**
 * Возвращает JSON-ответ и завершает выполнение.
 *
 * @param array<string, mixed> $payload
 */
function json_response(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Возвращает структурированную ошибку и завершает выполнение. */
function error_response(int $status, string $code, string $message, ?string $field = null): never
{
    $error = ['code' => $code, 'message' => $message];
    if ($field !== null) {
        $error['field'] = $field;
    }

    json_response($status, ['ok' => false, 'error' => $error]);
}

/** Читает строку из окружения с обрезкой пробелов. */
function env_string(string $name, string $default = ''): string
{
    $value = getenv($name);
    return $value === false ? $default : trim($value);
}

/** Включён ли dry-run. */
function is_dry_run(): bool
{
    $value = strtolower(env_string('TG_DRY_RUN', '0'));
    return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

/** Длина строки с fallback, если mbstring недоступен. */
function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

/** Нормализует телефон до 375XXXXXXXXX или возвращает пустую строку. */
function normalize_phone(string $raw): string
{
    $digits = preg_replace('/\D+/', '', $raw) ?? '';

    if (strlen($digits) === 11 && str_starts_with($digits, '80')) {
        $digits = '375' . substr($digits, 2);
    }

    $national = str_starts_with($digits, '375') ? substr($digits, 3) : $digits;

    return strlen($national) === 9 ? '375' . $national : '';
}

/** Форматирует нормализованный телефон в +375 XX XXX-XX-XX. */
function format_phone(string $normalized): string
{
    return '+375 ' . substr($normalized, 3, 2) . ' ' . substr($normalized, 5, 3)
        . '-' . substr($normalized, 8, 2) . '-' . substr($normalized, 10, 2);
}

/** Экранирует значение для parse_mode=HTML. */
function escape_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Очищает pathname страницы для лога и Telegram. */
function sanitize_page(string $raw): string
{
    $page = trim($raw);
    $page = preg_replace('/[\x00-\x1F\x7F]/u', '', $page) ?? '';

    if ($page === '' || $page[0] !== '/') {
        return '';
    }

    return text_length($page) > 200 ? substr($page, 0, 200) : $page;
}

/** Список разрешённых origin. */
function allowed_origins(): array
{
    $raw = env_string('ALLOWED_ORIGINS', 'https://kiberstol.by');
    $origins = [];

    foreach (explode(',', $raw) as $origin) {
        $origin = rtrim(trim($origin), '/');
        if ($origin !== '') {
            $origins[] = $origin;
        }
    }

    return $origins;
}

/** Приводит URL Referer к origin (scheme://host[:port]). */
function origin_from_url(string $url): string
{
    $parts = parse_url($url);
    if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
        return '';
    }

    $origin = $parts['scheme'] . '://' . $parts['host'];
    if (!empty($parts['port'])) {
        $origin .= ':' . $parts['port'];
    }

    return $origin;
}

/** Проверяет Origin/Referer по ALLOWED_ORIGINS. */
function is_allowed_origin(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $referer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));

    $candidate = $origin !== '' ? origin_from_url($origin) : origin_from_url($referer);
    if ($candidate === '') {
        return false;
    }

    return in_array(rtrim($candidate, '/'), allowed_origins(), true);
}

/** Список доверенных прокси (IP/CIDR). */
function trusted_proxies(): array
{
    $raw = env_string('TRUSTED_PROXIES');
    if ($raw === '') {
        return [];
    }

    $proxies = [];
    foreach (explode(',', $raw) as $entry) {
        $entry = trim($entry);
        if ($entry !== '') {
            $proxies[] = $entry;
        }
    }

    return $proxies;
}

/** Проверяет попадание IPv4 в IP/CIDR-правило. */
function ip_matches(string $ip, string $rule): bool
{
    if (!str_contains($rule, '/')) {
        return $ip === $rule;
    }

    [$subnet, $bitsRaw] = explode('/', $rule, 2);
    if (
        filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false
        || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false
    ) {
        return false;
    }

    $bits = (int) $bitsRaw;
    if ($bits < 0 || $bits > 32) {
        return false;
    }

    $mask = $bits === 0 ? 0 : (~0 << (32 - $bits)) & 0xFFFFFFFF;

    return (ip2long($ip) & $mask) === (ip2long($subnet) & $mask);
}

/** IP клиента с учётом TRUSTED_PROXIES и X-Forwarded-For. */
function client_ip(): string
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $trusted = trusted_proxies();

    if ($remote !== '' && $trusted !== []) {
        $isTrusted = false;
        foreach ($trusted as $rule) {
            if (ip_matches($remote, $rule)) {
                $isTrusted = true;
                break;
            }
        }

        if ($isTrusted) {
            $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
            foreach (explode(',', $forwarded) as $candidate) {
                $candidate = trim($candidate);
                if ($candidate !== '' && filter_var($candidate, FILTER_VALIDATE_IP) !== false) {
                    return $candidate;
                }
            }
        }
    }

    return $remote !== '' ? $remote : 'unknown';
}

/** Каталог счётчиков rate limit. */
function rate_limit_dir(): string
{
    $dir = env_string('RATE_LIMIT_DIR', sys_get_temp_dir());

    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    return rtrim($dir, '/\\');
}

/** Удаляет устаревшие файлы счётчиков (редко, чтобы не тормозить запросы). */
function cleanup_rate_files(string $dir, int $maxAge): void
{
    if (random_int(1, 100) !== 1) {
        return;
    }

    $files = glob($dir . DIRECTORY_SEPARATOR . RATE_FILE_PREFIX . '*.json');
    if ($files === false) {
        return;
    }

    $now = time();
    foreach ($files as $file) {
        $mtime = @filemtime($file);
        if ($mtime !== false && ($now - $mtime) > $maxAge) {
            @unlink($file);
        }
    }
}

/**
 * Учитывает попытку в rate limit.
 *
 * @return bool true — лимит превышен.
 */
function rate_limit_hit(string $key, int $limit, int $window): bool
{
    $dir = rate_limit_dir();
    cleanup_rate_files($dir, $window * 2);

    $file = $dir . DIRECTORY_SEPARATOR . RATE_FILE_PREFIX . hash('sha256', $key) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        // Не блокируем приём заявок из-за проблем с файловой системой.
        return false;
    }

    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return false;
    }

    $raw = stream_get_contents($handle);
    $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
    $now = time();

    $recent = [];
    if (is_array($decoded)) {
        foreach ($decoded as $timestamp) {
            if (is_int($timestamp) && $timestamp <= $now && ($now - $timestamp) < $window) {
                $recent[] = $timestamp;
            }
        }
    }

    $limited = count($recent) >= $limit;

    if (!$limited) {
        $recent[] = $now;
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, (string) json_encode($recent));
        fflush($handle);
    }

    flock($handle, LOCK_UN);
    fclose($handle);

    return $limited;
}

/** Опциональный лог заявок вне webroot (PII — только при явной настройке). */
function write_lead_log(array $lead): void
{
    $path = env_string('LEADS_LOG_PATH');
    if ($path === '') {
        return;
    }

    $line = json_encode($lead, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Отправляет сообщение в Telegram.
 *
 * @return array{ok: bool, reason: string}
 */
function send_telegram(string $token, string $chatId, string $text): array
{
    $base = rtrim(env_string('TG_API_BASE', 'https://api.telegram.org'), '/');
    $url = $base . '/bot' . $token . '/sendMessage';

    $payload = http_build_query([
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => 'true',
    ]);

    $timeout = 10;

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl === false) {
            return ['ok' => false, 'reason' => 'curl init failed'];
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => $timeout,
        ]);

        $body = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        if ($body === false) {
            return ['ok' => false, 'reason' => 'request failed: ' . $error];
        }
        if ($status >= 400) {
            return ['ok' => false, 'reason' => 'http status ' . $status];
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $payload,
                'timeout' => $timeout,
                'ignore_errors' => true,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            return ['ok' => false, 'reason' => 'request failed'];
        }
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded) || ($decoded['ok'] ?? false) !== true) {
        $description = is_array($decoded) && isset($decoded['description'])
            ? (string) $decoded['description']
            : 'invalid response';

        return ['ok' => false, 'reason' => $description];
    }

    return ['ok' => true, 'reason' => ''];
}

/** Обрабатывает запрос по контракту. */
function handle_request(): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''));

    // Health-check доступен без POST и без Origin (smoke после деплоя).
    if ($method === 'GET' && isset($_GET['health'])) {
        $configured = env_string('TG_BOT_TOKEN') !== '' && env_string('TG_CHAT_ID') !== '';
        json_response(200, [
            'ok' => true,
            'configured' => $configured,
            'dryRun' => is_dry_run(),
        ]);
    }

    if ($method !== 'POST') {
        header('Allow: POST');
        error_response(405, 'method_not_allowed', 'Метод не поддерживается.');
    }

    if (!is_allowed_origin()) {
        error_response(403, 'forbidden_origin', 'Отправка заявки с этого адреса запрещена.');
    }

    // Honeypot: бот заполняет скрытое поле — тихо «принимаем».
    if (trim((string) ($_POST['website'] ?? '')) !== '') {
        json_response(200, ['ok' => true]);
    }

    // Тайминг: elapsed (мс), иначе legacy ts (unix-секунды).
    $elapsedRaw = trim((string) ($_POST['elapsed'] ?? ''));
    if ($elapsedRaw !== '' && preg_match('/^\d+$/', $elapsedRaw) === 1) {
        $elapsed = (int) $elapsedRaw;
        if ($elapsed < FORM_MIN_ELAPSED_MS) {
            json_response(200, ['ok' => true]);
        }
    } else {
        $tsRaw = trim((string) ($_POST['ts'] ?? ''));
        if ($tsRaw !== '' && preg_match('/^\d+$/', $tsRaw) === 1) {
            $ts = (int) $tsRaw;
            if ($ts > 0 && (time() - $ts) < 3) {
                json_response(200, ['ok' => true]);
            }
        }
    }

    // Обязательное согласие на обработку ПД.
    $consentPd = trim((string) ($_POST['consent-pd'] ?? ''));
    if (!in_array($consentPd, ['on', '1', 'true'], true)) {
        error_response(
            422,
            'consent_required',
            'Требуется согласие на обработку персональных данных.',
            'consent-pd',
        );
    }

    $marketing = in_array(
        trim((string) ($_POST['marketing-consent'] ?? '')),
        ['on', '1', 'true'],
        true,
    );

    // Валидация и нормализация полей.
    $name = preg_replace('/\s+/u', ' ', trim((string) ($_POST['name'] ?? ''))) ?? '';
    if ($name === '') {
        error_response(422, 'validation', 'Укажите имя.', 'name');
    }
    if (text_length($name) > 100) {
        error_response(422, 'validation', 'Имя слишком длинное.', 'name');
    }

    $phone = normalize_phone((string) ($_POST['phone'] ?? ''));
    if ($phone === '') {
        error_response(422, 'validation', 'Укажите корректный номер телефона.', 'phone');
    }

    $message = trim((string) ($_POST['message'] ?? ''));
    if (text_length($message) > 1000) {
        error_response(422, 'validation', 'Сообщение слишком длинное.', 'message');
    }

    $page = sanitize_page((string) ($_POST['page'] ?? ''));
    $formId = trim((string) ($_POST['form-id'] ?? ''));
    if (text_length($formId) > 64) {
        $formId = substr($formId, 0, 64);
    }

    $dryRun = is_dry_run();
    $token = env_string('TG_BOT_TOKEN');
    $chatId = env_string('TG_CHAT_ID');

    if (!$dryRun && ($token === '' || $chatId === '')) {
        error_response(
            503,
            'not_configured',
            'Сервер временно не принимает заявки. Свяжитесь с нами по телефону.',
        );
    }

    // Rate limit: IP и хеш телефона. Хранится только хеш — без ПД.
    $ip = client_ip();
    $ipLimited = rate_limit_hit('ip:' . $ip, RATE_LIMIT_IP, RATE_LIMIT_WINDOW);
    $phoneLimited = rate_limit_hit(
        'phone:' . hash('sha256', $phone),
        RATE_LIMIT_PHONE,
        RATE_LIMIT_WINDOW,
    );

    if ($ipLimited || $phoneLimited) {
        error_log('kiberstol-form: rate_limited');
        error_response(429, 'rate_limited', 'Слишком много заявок. Попробуйте позже.');
    }

    $consentVersion = env_string('FORM_CONSENT_VERSION', '1');
    $lead = [
        'createdAt' => date('c'),
        'name' => $name,
        'phone' => $phone,
        'message' => $message,
        'page' => $page,
        'formId' => $formId,
        'consentPd' => $consentVersion,
        'marketingConsent' => $marketing,
    ];

    if ($dryRun) {
        write_lead_log($lead);
        error_log(
            'kiberstol-form: dry_run accepted lead page=' . ($page !== '' ? $page : '-')
            . ' marketing=' . ($marketing ? 'yes' : 'no'),
        );
        json_response(200, ['ok' => true, 'dryRun' => true]);
    }

    $safePage = $page !== '' ? escape_html($page) : '';
    $text = "Новая заявка с сайта Kiberstol.by\n\n"
        . 'Имя: ' . escape_html($name) . "\n"
        . 'Телефон: ' . escape_html(format_phone($phone)) . "\n"
        . ($message !== '' ? 'Сообщение: ' . escape_html($message) . "\n" : '')
        . ($safePage !== '' ? 'Страница: ' . $safePage . "\n" : '')
        . 'Согласие ПД: да (' . escape_html($consentVersion) . ")\n"
        . 'Согласие на рекламу: ' . ($marketing ? 'да' : 'нет') . "\n"
        . 'Дата: ' . date('d.m.Y H:i:s');

    $result = send_telegram($token, $chatId, $text);

    if (!$result['ok']) {
        $reason = preg_replace('/\s+/', ' ', substr($result['reason'], 0, 200)) ?? '';
        error_log('kiberstol-form: telegram_failed ' . $reason);
        error_response(
            502,
            'telegram_failed',
            'Не удалось отправить заявку. Попробуйте ещё раз.',
        );
    }

    write_lead_log($lead);
    json_response(200, ['ok' => true]);
}

try {
    handle_request();
} catch (Throwable $exception) {
    // Не логируем данные заявки и токен — только класс исключения.
    error_log('kiberstol-form: unhandled ' . get_class($exception));
    if (!headers_sent()) {
        error_response(500, 'server_error', 'Внутренняя ошибка сервера. Попробуйте позже.');
    }
}
