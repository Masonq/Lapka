# Статус реализации PetSocial

Сверка `product-blueprint.md` / `tz-v4-ultimate.md` с тем, что реально работает в коде.
Обновлять при каждой итерации. Легенда: ✅ готово · 🟡 частично · ⬜ не начато.

| # | Раздел | Статус | Заметки |
|---|--------|--------|---------|
| 1 | UX-принципы | 🟡 | loading/empty/error есть почти везде; геолокация текстом (без карты и без точных координат — ок) |
| 2 | Глобальная навигация | ✅ | Mobile: Home/Explore/Create/Messages/Profile — сделано. Desktop: пока верхнее меню, не левый сайдбар как на референсе |
| 3 | Home | 🟡 | Есть: лента, поиск, фильтры типов, Quick Actions (Потерялся/Нашёлся/Ищет дом), вкладки For You/Following (реальные подписки, не заглушка). Нет: Pet Switcher, Pet Hub Card, Stories, вкладки Nearby (нет гео), Local Pulse, рекомендаций сообществ/питомцев |
| 4 | Pet Hub | 🟡 | Список питомцев в профиле есть (`/pets`). Нет: карточка-хаб с Today/Health/Walk shortcuts/Friends/Documents |
| 5 | Создание питомца | ✅ | Есть: фото, имя, вид, порода, пол, возраст, город, активность, характер/интересы (текстом в about). Нет: дата рождения (только целый возраст) — сочли достаточным |
| 6 | Pet Profile | ✅ | Публичная страница `/pets/:id`: аватар, факты, город/активность, характер, карточка владельца. Нет: Stats (posts/friends/followers у питомца), Tabs (Photos/Friends/Health), QR Pet ID, Follow/Message — питомец пока не самостоятельный социальный объект (нет подписок/сообщений на питомца, только на владельца) |
| 7 | Feed / Post Detail | ✅ | Есть свой URL, автор, медиа (одно фото), caption, локация, комментарии, save (закладка + страница "Сохранённое"), report (жалоба сохраняется в БД, очереди разбора пока нет — см. раздел 24-25), delete. Нет: карусель медиа (только 1 фото), reactions (только комментарии), edit поста, mute/hide |
| 8 | Create Center | ✅ | Сделано — типы скрываются, а не блокируются. Реализовано: lost/found/adopt/question/general. Нет: Story/Poll/Walk/Event/Listing/Review |
| 9 | Explore | 🟡 | Поиск + услуги + реальные блоки Рядом (по городу) и сообществ (превью 3 + ссылка) работают. Events/Adoption/Marketplace — честные заглушки "скоро" |
| 10 | Search | 🟡 | Есть autocomplete-подобный debounce-поиск по постам. Нет: вкладок People/Pets/Communities/Events, фильтров, recent/saved searches |
| 11 | Nearby | 🟡 | По городу (не по точным координатам — блюпринт прямо это запрещает, а геолокации/карты у нас нет): публичный список питомцев с фильтром по городу. Нет: Map/List toggle, distance filter, species/breed/age/activity фильтры, Start Walk CTA, nearby events/places |
| 12–13 | Communities | 🟡 | Создание, поиск/фильтр по городу, вступление/выход (с защитой последнего админа и от гонки при параллельном вступлении), список участников с ролями, посты внутри сообщества (нужно членство для публикации). Нет: Chat/Guides/Media вкладок, pinned announcement, rules, moderators UI, health indicators, cover-изображения (только avatar_url) |
| 14 | Chat | 🟡 | Личные сообщения 1:1 работают: список бесед, тред, отправка, счётчик непрочитанных, отметка прочитанным при открытии, бейдж на вкладке "Чаты". Доставка через polling (5с в треде, 30с общий счётчик), не WebSocket. Нет: групповых чатов (community-чат внутри сообщества), realtime, reply/reaction/attachment/mention, report/block/mute, admin moderation tools |
| 15 | Walk | ⬜ | Не начато |
| 16 | Events | ⬜ | Не начато |
| 17 | Lost & Found | ✅ | Основа продукта — типы lost/found, last_seen_location, фото, статус resolved. Нет: sighting reports, notify communities, status timeline |
| 18 | Services / Business | 🟡 | Каталог услуг + отзывы + рейтинг работают. Нет: verified badge, часы работы, карта, booking (сам блюпринт помечает booking как Phase 3) |
| 19 | Health | ⬜ | Не начато. **Важно:** это медицинские данные — при реализации не должны попадать в ленту/рекомендации (см. раздел 19 блюпринта) |
| 20 | Marketplace | ⬜ | Не начато |
| 21 | Notifications | 🟡 | Есть: колокольчик в шапке со счётчиком (опрос раз в 30с), список, mark all read/mark one read, триггеры на follow и comment. Нет: категорий All/Social/Messages/Pet/Local/Safety/System (у нас только 2 типа событий), realtime (только polling), notification settings |
| 22 | Profile | 🟡 | Аватар/имя/город/питомцы/сохранённое/настройки/выход есть. Нет: privacy, security (кроме смены пароля), blocked users, followers/following счётчики на своей странице (есть только в публичном профиле) |
| 23 | Settings | 🟡 | Смена пароля, удаление аккаунта (с каскадным удалением всех данных — питомцы/посты/комментарии/подписки/отзывы/уведомления). Нет: account (кроме пароля), notifications settings, location, language, appearance, data export, help & support |
| 24–25 | Admin Dashboard + модерация | 🟡 | Overview (счётчики), очередь жалоб (dismiss/удалить пост), audit log — реально работают, is_admin проверяется на бэкенде и не светится в публичной схеме пользователя. Нет: Users/Pets/Communities/Businesses/Verifications/Marketplace вкладок, feature flags, apologize-flow при апелляции |
| 26 | User flows | 🟡 | Регистрация и первый пост работают близко к описанным flow. Остальные flow зависят от нереализованных разделов |
| 27 | Компонентная система UI | 🟡 | Button/Input/Avatar/PostCard/Toast/Skeleton/EmptyState есть. Нет отдельных: CommunityCard/EventCard/WalkCard/BusinessCard/ListingCard/StoryAvatar/ChatBubble/BottomSheet/Modal/FilterDrawer/MapMarker |
| 28 | Дизайн-система | 🟡 | Палитра под `design-reference.png` — тёплый оранжевый, снят пипеткой по пикселям. Применено к существующим экранам. Нет: левый сайдбар на десктопе (сейчас верхнее меню), ~25 нереализованных экранов referencе (сторис/сообщества/чат/здоровье/карта/marketplace) без своего дизайна, т.к. бэкенда под них нет |
| 29 | API/backend layers | 🟡 | Auth, User/Pet, Social (posts/comments/follows), Services — есть. Community/Messaging/Discovery-Geo/Events-Walks/Marketplace/Moderation/Notification/Billing domains — нет |
| 30 | Sprint Plan | — | Ориентир, не чеклист к вычёркиванию построчно |
| 31 | MVP Release Gates | 🟡 | Есть: тесты (127), rate limiting, миграции, non-root Docker, CORS, audit log для действий модерации. Нет: E2E, permissions-аудит по ролям, Terms/Privacy/Guidelines, backups (описаны в README ima mesta по аналогии, здесь не настроены) |
| 32–34 | Roadmap / KPI | — | Ориентир на будущее, не задача для кода |

## Что реально сделано сверх блюпринта
Rate limiting, non-root Docker, CORS restriction, Alembic-миграции, security-заголовки nginx,
audit зависимостей, EXIF-очистка загружаемых фото — блюпринт этого не требует явно, но это
часть раздела 31 (Release Gates) и общей инженерной гигиены.
