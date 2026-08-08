# Статус реализации PetSocial

Сверка `product-blueprint.md` / `tz-v4-ultimate.md` с тем, что реально работает в коде.
Обновлять при каждой итерации. Легенда: ✅ готово · 🟡 частично · ⬜ не начато.

| # | Раздел | Статус | Заметки |
|---|--------|--------|---------|
| 1 | UX-принципы | 🟡 | loading/empty/error есть почти везде; геолокация текстом (без карты и без точных координат — ок) |
| 2 | Глобальная навигация | ✅ | Mobile: Home/Explore/Create/Messages/Profile — сделано. Desktop: пока верхнее меню, не левый сайдбар как на референсе |
| 3 | Home | 🟡 | Лента + поиск + фильтры есть. Нет: Pet Switcher, Pet Hub Card, Stories, Quick Actions, вкладок For You/Following/Nearby, Local Pulse, рекомендаций |
| 4 | Pet Hub | 🟡 | Список питомцев в профиле есть (`/pets`). Нет: карточка-хаб с Today/Health/Walk shortcuts/Friends/Documents |
| 5 | Создание питомца | 🟡 | Есть: фото, имя, вид, порода, возраст. Нет: пол, дата рождения, город, характер, активность, интересы |
| 6 | Pet Profile | ⬜ | Отдельной публичной страницы питомца нет (только в составе профиля владельца) |
| 7 | Feed / Post Detail | 🟡 | Есть свой URL, автор, медиа (одно фото), caption, локация, комментарии, save нет, report нет, edit/delete есть (только delete) |
| 8 | Create Center | ✅ | Сделано — типы скрываются, а не блокируются. Реализовано: lost/found/adopt/question/general. Нет: Story/Poll/Walk/Event/Listing/Review |
| 9 | Explore | 🟡 | Поиск + услуги реально работают. Nearby/Communities/Events/Adoption/Marketplace — честные заглушки "скоро" |
| 10 | Search | 🟡 | Есть autocomplete-подобный debounce-поиск по постам. Нет: вкладок People/Pets/Communities/Events, фильтров, recent/saved searches |
| 11 | Nearby | ⬜ | Не начато — нет геолокации/карты вообще |
| 12–13 | Communities | ⬜ | Не начато |
| 14 | Chat | ⬜ | Не начато — есть только страница-заглушка `/messages` |
| 15 | Walk | ⬜ | Не начато |
| 16 | Events | ⬜ | Не начато |
| 17 | Lost & Found | ✅ | Основа продукта — типы lost/found, last_seen_location, фото, статус resolved. Нет: sighting reports, notify communities, status timeline |
| 18 | Services / Business | 🟡 | Каталог услуг + отзывы + рейтинг работают. Нет: verified badge, часы работы, карта, booking (сам блюпринт помечает booking как Phase 3) |
| 19 | Health | ⬜ | Не начато. **Важно:** это медицинские данные — при реализации не должны попадать в ленту/рекомендации (см. раздел 19 блюпринта) |
| 20 | Marketplace | ⬜ | Не начато |
| 21 | Notifications | ⬜ | Не начато — есть только тосты на месте действия, нет центра уведомлений |
| 22 | Profile | 🟡 | Аватар/имя/город/питомцы/выход есть. Нет: settings, privacy, security, blocked users, saved, followers/following счётчики (счётчик подписчиков есть только в публичном профиле) |
| 23 | Settings | ⬜ | Не начато |
| 24–25 | Admin Dashboard + модерация | ⬜ | Не начато |
| 26 | User flows | 🟡 | Регистрация и первый пост работают близко к описанным flow. Остальные flow зависят от нереализованных разделов |
| 27 | Компонентная система UI | 🟡 | Button/Input/Avatar/PostCard/Toast/Skeleton/EmptyState есть. Нет отдельных: CommunityCard/EventCard/WalkCard/BusinessCard/ListingCard/StoryAvatar/ChatBubble/BottomSheet/Modal/FilterDrawer/MapMarker |
| 28 | Дизайн-система | 🟡 | Своя палитра (жёлтый/чёрный, стиль Яндекса) — **отличается от `design-reference.png`** (тёплый оранжевый, левый сайдбар). Не пересобирали дизайн под референс — решить отдельно, стоит ли |
| 29 | API/backend layers | 🟡 | Auth, User/Pet, Social (posts/comments/follows), Services — есть. Community/Messaging/Discovery-Geo/Events-Walks/Marketplace/Moderation/Notification/Billing domains — нет |
| 30 | Sprint Plan | — | Ориентир, не чеклист к вычёркиванию построчно |
| 31 | MVP Release Gates | 🟡 | Есть: тесты (60), rate limiting, миграции, non-root Docker, CORS. Нет: E2E, permissions-аудит по ролям (ролей пока и нет кроме user), Terms/Privacy/Guidelines, backups (описаны в README ima mesta по аналогии, здесь не настроены) |
| 32–34 | Roadmap / KPI | — | Ориентир на будущее, не задача для кода |

## Что реально сделано сверх блюпринта
Rate limiting, non-root Docker, CORS restriction, Alembic-миграции, security-заголовки nginx,
audit зависимостей, EXIF-очистка загружаемых фото — блюпринт этого не требует явно, но это
часть раздела 31 (Release Gates) и общей инженерной гигиены.
