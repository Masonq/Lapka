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
    "unknown_post_type": {
        "ru": "Неизвестный тип поста",
        "sr": "Nepoznat tip objave",
    },
    "login_required_for_following_feed": {
        "ru": "Войди, чтобы смотреть ленту подписок",
        "sr": "Prijavi se da vidiš listu praćenja",
    },
    "title_and_body_required": {
        "ru": "Заголовок и описание не могут быть пустыми",
        "sr": "Naslov i opis ne mogu biti prazni",
    },
    "must_join_community_to_post": {
        "ru": "Нужно вступить в сообщество, чтобы публиковать в нём",
        "sr": "Moraš se pridružiti zajednici da bi objavljivao(la) u njoj",
    },
    "post_not_found": {
        "ru": "Пост не найден",
        "sr": "Objava nije pronađena",
    },
    "can_only_resolve_own_post": {
        "ru": "Можно закрыть только свой пост",
        "sr": "Možeš zatvoriti samo svoju objavu",
    },
    "can_only_edit_own_post": {
        "ru": "Можно редактировать только свой пост",
        "sr": "Možeš izmeniti samo svoju objavu",
    },
    "title_required": {
        "ru": "Заголовок не может быть пустым",
        "sr": "Naslov ne može biti prazan",
    },
    "body_required": {
        "ru": "Описание не может быть пустым",
        "sr": "Opis ne može biti prazan",
    },
    "can_only_delete_own_post": {
        "ru": "Можно удалить только свой пост",
        "sr": "Možeš obrisati samo svoju objavu",
    },
    "comment_required": {
        "ru": "Комментарий не может быть пустым",
        "sr": "Komentar ne može biti prazan",
    },
    "sighting_only_for_lost_found": {
        "ru": "Отметить наблюдение можно только у потеряшки или находки",
        "sr": "Zapažanje se može dodati samo kod izgubljenih ili pronađenih",
    },
    "listing_type_must_be_one_of": {
        "ru": "Тип должен быть одним из",
        "sr": "Tip mora biti jedan od",
    },
    "price_required_for_sale": {
        "ru": "Для продажи нужно указать цену",
        "sr": "Za prodaju je potrebno navesti cenu",
    },
    "listing_not_found": {
        "ru": "Объявление не найдено",
        "sr": "Oglas nije pronađen",
    },
    "can_only_mark_own_listing_sold": {
        "ru": "Можно отметить проданным только своё объявление",
        "sr": "Možeš označiti kao prodato samo svoj oglas",
    },
    "can_only_delete_own_listing": {
        "ru": "Можно удалить только своё объявление",
        "sr": "Možeš obrisati samo svoj oglas",
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
