<?php
/**
 * submit.php — приём заявок формы заказа → Telegram Bot API.
 *
 * Защита от спама (серверная, дублирует клиентскую):
 *  - honeypot: поле `website` должно быть пустым;
 *  - time-honeypot: поле `ts` (unix-секунды) должно быть не старше 3 секунд.
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

$name = trim((string) ($_POST['name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));

if ($name === '' || $phone === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Заполните имя и телефон']);
    exit;
}

$token = getenv('TG_BOT_TOKEN');
$chatId = getenv('TG_CHAT_ID');

if (!$token || !$chatId) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Сервер не настроен']);
    exit;
}

$text = "Новая заявка с сайта Kiberstol.by\n\n"
    . "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
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