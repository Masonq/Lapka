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
| 9 | Explore | 🟡 | Поиск + услуги + реальные блоки Рядом (по городу), Прогулки и события, Барахолка, сообществ (превью 3 + ссылка) работают. Adoption — честная заглушка "скоро" |
| 10 | Search | 🟡 | Есть autocomplete-подобный debounce-поиск по постам. Нет: вкладок People/Pets/Communities/Events, фильтров, recent/saved searches |
| 11 | Nearby | 🟡 | По городу (не по точным координатам — блюпринт прямо это запрещает, а геолокации/карты у нас нет): публичный список питомцев с фильтром по городу. Нет: Map/List toggle, distance filter, species/breed/age/activity фильтры, Start Walk CTA, nearby events/places |
| 12–13 | Communities | 🟡 | Создание, поиск/фильтр по городу, вступление/выход (с защитой последнего админа и от гонки при параллельном вступлении), список участников с ролями, посты внутри сообщества (нужно членство для публикации). Нет: Chat/Guides/Media вкладок, pinned announcement, rules, moderators UI, health indicators, cover-изображения (только avatar_url) |
| 14 | Chat | 🟡 | Личные сообщения 1:1 работают: список бесед, тред, отправка, счётчик непрочитанных, отметка прочитанным при открытии, бейдж на вкладке "Чаты". Доставка через polling (5с в треде, 30с общий счётчик), не WebSocket. Нет: групповых чатов (community-чат внутри сообщества), realtime, reply/reaction/attachment/mention, report/block/mute, admin moderation tools |
| 15 | Walk | 🟡 | Объединено с Events в одну модель (структурно то же самое — дата/время/место/участники, разница только в привязке питомца). Создание с выбором своего питомца, join/leave, участники, лимит вместимости. Нет: отдельного чата прогулки, cancel/report как отдельных действий |
| 16 | Events | 🟡 | Та же модель, что и Walk (см. выше). Cover/reminder/event chat не реализованы |
| 17 | Lost & Found | ✅ | Основа продукта — типы lost/found, last_seen_location, фото, статус resolved. Sighting reports работают: структурированное "видел тут" (место + заметка + время наблюдения) отдельно от комментариев, уведомляет автора поста. Нет: notify communities, status timeline |
| 18 | Services / Business | 🟡 | Каталог услуг + отзывы + рейтинг работают. Нет: verified badge, часы работы, карта, booking (сам блюпринт помечает booking как Phase 3) |
| 19 | Health | 🟡 | Вакцинации/обработка от паразитов/лекарства/вес/визиты к ветеринару, приватно (403 не владельцу, проверено тестом), не попадает в ленту/рекомендации (собственный роутер, отдельный от постов). Нет: дашборда с графиком веса, отдельного экрана документов, интеграции reminders с общим Notification |
| 20 | Marketplace | 🟡 | Категории (продажа/ищут/отдам даром), поиск, фильтр по городу/категории, listing card/detail, save, report (собственный, разделяет модель Report с постами — очередь модерации видит оба типа), create listing, mark-sold, seller profile через существующий /users/:id, chat через существующие личные сообщения, удаление админом (как посты). Нет: отдельного Wanted/Sell/Give away визуального разделения на 3 разные вкладки (объединено фильтром type) |
| 21 | Notifications | 🟡 | Есть: колокольчик в шапке со счётчиком (опрос раз в 30с), список, mark all read/mark one read, триггеры на follow и comment. Нет: категорий All/Social/Messages/Pet/Local/Safety/System (у нас только 2 типа событий), realtime (только polling), notification settings |
| 22 | Profile | 🟡 | Аватар/имя/город/питомцы/сохранённое/настройки/выход есть. Кликабельные счётчики подписчиков/подписок теперь и на своей, и на чужой странице (были только у чужой, и то не кликабельные) — ведут на список /users/:id/connections. Нет: privacy, security (кроме смены пароля), blocked users |
| 23 | Settings | 🟡 | Смена пароля, удаление аккаунта (с каскадным удалением всех данных — питомцы/посты/комментарии/подписки/отзывы/уведомления). Нет: account (кроме пароля), notifications settings, location, language, appearance, data export, help & support |
| 24–25 | Admin Dashboard + модерация | 🟡 | Overview (счётчики), очередь жалоб на посты И объявления (dismiss/удалить), audit log — реально работают, is_admin проверяется на бэкенде и не светится в публичной схеме пользователя. Нет: Users/Pets/Communities/Businesses/Verifications вкладок, feature flags, apologize-flow при апелляции |
| 26 | User flows | 🟡 | Регистрация и первый пост работают близко к описанным flow. Остальные flow зависят от нереализованных разделов |
| 27 | Компонентная система UI | 🟡 | Button/Input/Avatar/PostCard/Toast/Skeleton/EmptyState есть. Нет отдельных: CommunityCard/EventCard/WalkCard/BusinessCard/ListingCard/StoryAvatar/ChatBubble/BottomSheet/Modal/FilterDrawer/MapMarker |
| 28 | Дизайн-система | 🟡 | Палитра под `design-reference.png` — тёплый оранжевый, снят пипеткой по пикселям. Применено к существующим экранам. Нет: левый сайдбар на десктопе (сейчас верхнее меню), ~25 нереализованных экранов referencе (сторис/сообщества/чат/здоровье/карта/marketplace) без своего дизайна, т.к. бэкенда под них нет |
| 29 | API/backend layers | 🟡 | Auth, User/Pet, Social (posts/comments/follows), Services — есть. Community/Messaging/Discovery-Geo/Events-Walks/Marketplace/Moderation/Notification/Billing domains — нет |
| 30 | Sprint Plan | — | Ориентир, не чеклист к вычёркиванию построчно |
| 31 | MVP Release Gates | 🟡 | Есть: тесты (188), rate limiting, миграции, non-root Docker, CORS, audit log для действий модерации, все списочные эндпоинты проверены на N+1 (posts/communities/events/messages/services/admin — везде joinedload/батч-агрегаты вместо ленивой загрузки в цикле, закреплено тестами на реальное число SQL-запросов). Нет: E2E, permissions-аудит по ролям, Terms/Privacy/Guidelines, backups (описаны в README ima mesta по аналогии, здесь не настроены) |
| 32–34 | Roadmap / KPI | — | Ориентир на будущее, не задача для кода |

## Что реально сделано сверх блюпринта
Rate limiting, non-root Docker, CORS restriction, Alembic-миграции, security-заголовки nginx,
audit зависимостей, EXIF-очистка загружаемых фото — блюпринт этого не требует явно, но это
часть раздела 31 (Release Gates) и общей инженерной гигиены.
