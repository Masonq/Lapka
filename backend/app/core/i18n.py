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
    "account_banned": {
        "ru": "Аккаунт заблокирован",
        "sr": "Nalog je blokiran",
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
    "invalid_emoji": {
        "ru": "Такая реакция недоступна",
        "sr": "Ta reakcija nije dostupna",
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
    "pet_name_required": {
        "ru": "Кличка не может быть пустой",
        "sr": "Ime ne može biti prazno",
    },
    "pet_not_found": {
        "ru": "Питомец не найден",
        "sr": "Ljubimac nije pronađen",
    },
    "can_only_delete_own_pet": {
        "ru": "Можно удалить только своего питомца",
        "sr": "Možeš obrisati samo svog ljubimca",
    },
    "pet_health_owner_only": {
        "ru": "Здоровье питомца видит только владелец",
        "sr": "Zdravlje ljubimca vidi samo vlasnik",
    },
    "unknown_health_category": {
        "ru": "Неизвестная категория: должна быть одной из",
        "sr": "Nepoznata kategorija: mora biti jedna od",
    },
    "health_record_not_found": {
        "ru": "Запись не найдена",
        "sr": "Zapis nije pronađen",
    },
    "report_not_found": {
        "ru": "Жалоба не найдена",
        "sr": "Prijava nije pronađena",
    },
    "story_not_found": {
        "ru": "История не найдена",
        "sr": "Priča nije pronađena",
    },
    "community_not_found": {
        "ru": "Сообщество не найдено",
        "sr": "Zajednica nije pronađena",
    },
    "only_community_admin_can_edit": {
        "ru": "Редактировать сообщество может только его администратор",
        "sr": "Zajednicu može uređivati samo njen administrator",
    },
    "invalid_role": {
        "ru": "Роль должна быть одной из: user, editor, moderator",
        "sr": "Uloga mora biti jedna od: user, editor, moderator",
    },
    "user_not_found": {
        "ru": "Пользователь не найден",
        "sr": "Korisnik nije pronađen",
    },
    "cannot_ban_admin": {
        "ru": "Нельзя заблокировать администратора",
        "sr": "Nije moguće blokirati administratora",
    },
    "provider_profile_not_found": {
        "ru": "Анкета исполнителя не найдена",
        "sr": "Profil pružaoca usluga nije pronađen",
    },
    "unknown_service_type": {
        "ru": "Неизвестный тип услуги",
        "sr": "Nepoznat tip usluge",
    },
    "provider_profile_already_exists": {
        "ru": "Профиль исполнителя уже создан",
        "sr": "Profil pružaoca usluga je već kreiran",
    },
    "provider_not_found": {
        "ru": "Исполнитель не найден",
        "sr": "Pružalac usluga nije pronađen",
    },
    "cannot_review_self": {
        "ru": "Нельзя оставить отзыв самому себе",
        "sr": "Ne možeš ostaviti recenziju samom sebi",
    },
    "already_reviewed_provider": {
        "ru": "Ты уже оставлял отзыв этому исполнителю",
        "sr": "Već si ostavio(la) recenziju ovom pružaocu usluga",
    },
    "cannot_message_self": {
        "ru": "Нельзя написать самому себе",
        "sr": "Ne možeš pisati samom sebi",
    },
    "cannot_message_this_user": {
        "ru": "Нельзя написать этому пользователю",
        "sr": "Ne možeš pisati ovom korisniku",
    },
    "message_body_required": {
        "ru": "Сообщение не может быть пустым",
        "sr": "Poruka ne može biti prazna",
    },
    "unknown_event_type": {
        "ru": "Неизвестный тип: должно быть walk или event",
        "sr": "Nepoznat tip: mora biti walk ili event",
    },
    "can_only_link_own_pet": {
        "ru": "Можно указать только своего питомца",
        "sr": "Možeš navesti samo svog ljubimca",
    },
    "event_not_found": {
        "ru": "Событие не найдено",
        "sr": "Događaj nije pronađen",
    },
    "event_full": {
        "ru": "Мест больше нет",
        "sr": "Nema više mesta",
    },
    "only_jpeg_png_webp": {
        "ru": "Можно загружать только JPEG, PNG или WebP",
        "sr": "Možeš učitati samo JPEG, PNG ili WebP",
    },
    "empty_file": {
        "ru": "Пустой файл",
        "sr": "Prazan fajl",
    },
    "file_too_large": {
        "ru": "Файл слишком большой — максимум 8 МБ",
        "sr": "Fajl je prevelik — maksimum 8 MB",
    },
    "file_corrupted_not_image": {
        "ru": "Файл повреждён или не является изображением",
        "sr": "Fajl je oštećen ili nije slika",
    },
    "community_name_required": {
        "ru": "Название не может быть пустым",
        "sr": "Naziv ne može biti prazan",
    },
    "last_admin_cannot_leave": {
        "ru": "Ты последний админ сообщества — сначала назначь другого или удали сообщество",
        "sr": "Ti si poslednji admin zajednice — prvo postavi drugog ili obriši zajednicu",
    },
    "cannot_follow_self": {
        "ru": "Нельзя подписаться на себя",
        "sr": "Ne možeš zapratiti samog sebe",
    },
    "cannot_follow_this_user": {
        "ru": "Нельзя подписаться на этого пользователя",
        "sr": "Ne možeš zapratiti ovog korisnika",
    },
    "can_only_delete_own_story": {
        "ru": "Можно удалить только свою историю",
        "sr": "Možeš obrisati samo svoju priču",
    },
    "notification_not_found": {
        "ru": "Уведомление не найдено",
        "sr": "Obaveštenje nije pronađeno",
    },
    "not_your_notification": {
        "ru": "Это не твоё уведомление",
        "sr": "Ovo nije tvoje obaveštenje",
    },
    "cannot_block_self": {
        "ru": "Нельзя заблокировать самого себя",
        "sr": "Ne možeš blokirati samog sebe",
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
