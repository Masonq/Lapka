"""Перевод текстов ошибок (HTTPException detail) под язык интерфейса.

Фронтенд шлёт текущий выбранный язык заголовком X-Lang на каждый запрос
(см. frontend/src/api/client.js) — это НЕ то же самое, что Accept-Language
браузера: пользователь мог явно переключить язык в приложении вопреки
системному языку устройства, и именно этот явный выбор должен побеждать.

ЧЕСТНО про охват: на фронтенде переведено 584 строки интерфейса по всем
45 файлам. Здесь — только самые часто встречаемые ошибки (в первую очередь
auth.py — вход/регистрация/пароль, через которые проходит каждый
пользователь). Остальные ~79 HTTPException по другим роутерам (posts.py,
users.py, admin.py и т.д.) пока остаются на русском независимо от языка
интерфейса — это отдельный, сопоставимый по объёму кусок работы, не
делался в рамках этого захода. ERRORS ниже — растущий словарь: новые
роутеры можно переводить постепенно, добавляя ключи сюда."""
from fastapi import Header

SUPPORTED_LANGUAGES = ("ru", "sr")
DEFAULT_LANGUAGE = "ru"

ERRORS: dict[str, dict[str, str]] = {
    "code_not_requested": {
        "ru": "Код не запрашивался или уже использован — запроси новый",
        "sr": "Kod nije zatražen ili je već iskorišćen — zatraži novi",
    },
    "code_expired": {
        "ru": "Код истёк — запроси новый",
        "sr": "Kod je istekao — zatraži novi",
    },
    "too_many_code_attempts": {
        "ru": "Слишком много неверных попыток — запроси новый код",
        "sr": "Previše netačnih pokušaja — zatraži novi kod",
    },
    "wrong_code": {
        "ru": "Неверный код",
        "sr": "Netačan kod",
    },
    "email_already_registered": {
        "ru": "Такой email уже зарегистрирован",
        "sr": "Ovaj email je već registrovan",
    },
    "wrong_email_or_password": {
        "ru": "Неверный email или пароль",
        "sr": "Netačan email ili lozinka",
    },
    "telegram_signature_invalid": {
        "ru": "Подпись Telegram не подтверждена",
        "sr": "Telegram potpis nije potvrđen",
    },
    "no_password_telegram_account": {
        "ru": "У аккаунта нет пароля — вход через Telegram, менять нечего",
        "sr": "Nalog nema lozinku — prijava preko Telegrama, nema šta da se menja",
    },
    "wrong_current_password": {
        "ru": "Текущий пароль неверен",
        "sr": "Trenutna lozinka nije tačna",
    },
    "password_reset_failed": {
        "ru": "Не удалось сбросить пароль — попробуй запросить код заново",
        "sr": "Nije uspelo resetovanje lozinke — pokušaj da ponovo zatražiš kod",
    },
    "wrong_password": {
        "ru": "Неверный пароль",
        "sr": "Netačna lozinka",
    },
}


def get_lang(x_lang: str | None = Header(default=None, alias="X-Lang")) -> str:
    if x_lang in SUPPORTED_LANGUAGES:
        return x_lang
    return DEFAULT_LANGUAGE


def t(key: str, lang: str) -> str:
    entry = ERRORS.get(key)
    if not entry:
        # Ключа нет в словаре вообще — программная ошибка (опечатка в key),
        # возвращаем сам ключ, чтобы это было заметно при разработке, а не
        # падало молча
        return key
    return entry.get(lang) or entry[DEFAULT_LANGUAGE]
