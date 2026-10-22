<?php
/**
 * submit.php — приём заявок формы заказа → Telegram Bot API.
 *
 * Защита от спама (серверная, дублирует клиентскую):
 *  - honeypot: поле `website` должно быть пустым;
 *  - time-honeypot: поле `ts` (unix-секунды) должно быть не старше 3 секунд;
 *  - rate limiting: не более 5 заявок за 10 минут с одного IP.
 *
 * Обязательное согласие на обработку ПД (`consent-pd`) проверяется на сервере:
 * без него заявка не принимается (Закон РБ № 99-З).
 *
 * Секретные ключи хранятся ТОЛЬКО на сервере (getenv), не в репозитории.
 * Требует переменные окружения: TG_BOT_TOKEN, TG_CHAT_ID.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Разрешаем только POST.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Honeypot: скрытое поле должно быть пустым.
if (!empty($_POST['website'])) {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// Time-honeypot: форма должна заполняться не быстрее 3 секунд.
$ts = (int) ($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - $ts) < 3) {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// Обязательное согласие на обработку персональных данных.
if (empty($_POST['consent-pd'])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Требуется согласие на обработку персональных данных']);
    exit;
}

$name = trim((string) ($_POST['name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

if ($name === '' || $phone === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Заполните имя и телефон']);
    exit;
}

// Ограничиваем длину полей, чтобы не раздувать сообщение в Telegram.
if (mb_strlen($name) > 100 || mb_strlen($message) > 1000) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Слишком длинное имя или сообщение']);
    exit;
}

// Валидация телефона: белорусский формат +375 XX XXX-XX-XX.
$phoneDigits = preg_replace('/\D/', '', $phone) ?? '';
if (!preg_match('/^375\d{9}$/', $phoneDigits)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Укажите корректный номер телефона']);
    exit;
}
$phone = '+375 ' . substr($phoneDigits, 3, 2) . ' ' . substr($phoneDigits, 5, 3)
    . '-' . substr($phoneDigits, 8, 2) . '-' . substr($phoneDigits, 10, 2);

// Rate limiting: не более 5 заявок за 10 минут с одного IP.
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile = sys_get_temp_dir() . '/kiberstol-rate-' . md5($ip);
$now = time();
$window = 600;
$limit = 5;

$timestamps = [];
if (is_file($rateFile)) {
    $raw = @file_get_contents($rateFile);
    if ($raw !== false) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $timestamps = $decoded;
        }
    }
}
$timestamps = array_values(array_filter(
    $timestamps,
    static fn ($t): bool => is_int($t) && ($now - $t) < $window
));

if (count($timestamps) >= $limit) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Слишком много заявок. Попробуйте позже.']);
    exit;
}

$timestamps[] = $now;
@file_put_contents($rateFile, json_encode($timestamps), LOCK_EX);

$token = getenv('TG_BOT_TOKEN');
$chatId = getenv('TG_CHAT_ID');

if (!$token || !$chatId) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Сервер не настроен']);
    exit;
}

// Экранируем пользовательские данные: сообщение отправляется с parse_mode=HTML.
$safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safePhone = htmlspecialchars($phone, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

$text = "Новая заявка с сайта Kiberstol.by\n\n"
    . "Имя: {$safeName}\n"
    . "Телефон: {$safePhone}\n"
    . ($safeMessage !== '' ? "Сообщение: {$safeMessage}\n" : '')
    . 'Дата: ' . date('d.m.Y H:i:s');

$url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
$payload = http_build_query([
    'chat_id' => $chatId,
    'text' => $text,
    'parse_mode' => 'HTML',
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $payload,
        'timeout' => 10,
    ],
]);

$result = @file_get_contents($url, false, $context);

if ($result === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Не удалось отправить заявку']);
    exit;
}

echo json_encode(['ok' => true]);
