# PetSocial — Product Blueprint 1.0

Экранная архитектура, UX-flow и план разработки.

Документ дополняет `tz-v4-ultimate.md` и переводит продуктовую концепцию
в конкретную структуру интерфейсов и разработки. Референс дизайна: `design-reference.png`.

## 1. UX-принципы

- Mobile-first: основной сценарий рассчитан на телефон.
- Главный объект — питомец; профиль человека и профиль питомца связаны, но не смешиваются.
- Любое действие должно иметь понятный результат: опубликовано, отправлено, сохранено, создано, присоединено.
- Минимум обязательных полей на первом шаге; сложные данные заполняются позже.
- Геолокация используется только с явным разрешением и никогда не раскрывает точный домашний адрес.
- Основные действия доступны за 1–2 нажатия с главного экрана.
- Состояния loading / empty / error / success обязательны для каждого экрана.

## 2. Глобальная навигация

**Mobile:** Home (лента + Pet Hub), Explore (поиск/Nearby/сообщества/события/места/услуги),
Create (пост/story/walk/event/lost-found/listing), Messages, Profile (аккаунт/питомцы/настройки).

**Desktop:** левый сайдбар (Home, Explore, Communities, Nearby, Events, Lost & Found, Messages),
центр — текущий экран, правый сайдбар — рекомендации/события/питомцы рядом/alerts,
верхняя панель — глобальный поиск, create, уведомления, профиль.

## 3. Home

Header (логотип/город/уведомления/сообщения), Pet Switcher, Pet Hub Card (напоминание/событие/
быстрые действия), Stories carousel, Quick Actions (Post/Walk/Event/Lost Pet), Feed tabs
(For You/Following/Nearby), Post cards, Local Pulse (события и потеряшки рядом), Recommended
Communities, Recommended Pets. Пустое состояние без подписок — локальный контент + 3–5 сообществ.

## 4. Pet Hub

Карточка питомца (имя/фото/порода/возраст/город), Today (напоминания/события), Health shortcut,
Walk shortcut, Friends, Recent memories, Documents, Edit profile, Privacy. Несколько питомцев —
горизонтальный switcher без выхода из аккаунта.

## 5. Создание питомца

Фото, имя, вид, порода, пол, дата рождения/возраст, город, характер, уровень активности, интересы.
Health и документы не обязательны при onboarding.

## 6. Pet Profile

Hero (avatar/cover/имя/verified), Stats (posts/friends/followers), Actions (Follow/Friend/Message
Owner/Share), Tabs (Posts/Photos/Friends/About/Health), About, Owner card, QR Pet ID.

## 7. Feed / Post Detail

Автор (User или Pet), медиа-карусель, caption, теги локации/сообщества/события, реакции,
комментарии, save/share/report, меню поста (mute/hide/delete/edit). Post Detail — собственный URL,
корректный deep link.

## 8. Create Center

Post, Story, Question, Poll, Walk, Event, Lost Pet, Found Pet, Adoption, Marketplace Listing,
Review. Недоступные пользователю по роли типы **скрываются**, а не показываются заблокированными.

## 9. Explore

Global search, Trending locally, Nearby Pets, Communities, Events, Services, Pet-friendly Places,
Lost & Found, Adoption, Marketplace.

## 10. Search

Autocomplete, вкладки All/People/Pets/Communities/Posts/Events/Businesses, filter drawer,
recent/saved searches, geo/breed/species фильтры. При пустом результате — альтернативные запросы.

## 11. Nearby

Map/List toggle, distance filter, species/breed/age/activity фильтры, pet cards с расстоянием,
Start Walk CTA, nearby events/places. **Нельзя показывать точные координаты пользователя.**

## 12–13. Communities

Discovery, recommended, категории, локальные/породные сообщества, community detail (cover/avatar/
join/tabs/pinned announcement/rules/moderators/health indicators для админов).

## 14. Chat

Список бесед, unread count, поиск, message view (reply/reaction/attachment/mention),
report/block/mute, group info, admin moderation tools. **Realtime transport: WebSocket**,
серверное время + уникальный ID у каждого сообщения.

## 15. Walk

Create Walk (питомец/дата-время/публичность/место встречи/вместимость/описание), join/leave,
участники, чат, cancel/report. Для публичной встречи — не разрешать домашний адрес как точку.

## 16. Events

Cover, title, organizer, дата/время, локация, описание, участники, going/interested, share,
reminder, event chat.

## 17. Lost & Found

Emergency visual treatment, фото, имя, вид/порода, last seen место/время, описание, contact owner,
sighting report, notify relevant communities, status timeline. **Кратчайший путь от открытия до
публикации.**

## 18. Services / Business

Поиск бизнесов, категории, карта, business profile, verified badge, услуги, часы, локация, отзывы,
контакт. Booking — Phase 3.

## 19. Health

Dashboard, вакцинации, обработка от паразитов, лекарства, вес, ветеринар, документы, напоминания.
**Private by default — медицинские записи не попадают в ленту или рекомендации.**

## 20. Marketplace

Категории, поиск, listing card/detail, seller profile, chat seller, save/report, create listing
(Wanted/Sell/Give away).

## 21. Notifications

All/Social/Messages/Pet/Local/Safety/System, mark all read, notification settings.
**Safety-уведомления приоритетнее маркетинговых.**

## 22. Profile

Avatar/name/username, pets, posts, communities, saved, followers/following, settings, privacy,
security, blocked users.

## 23. Settings

Account, privacy, notifications, location, language, appearance, security, data export,
delete account, help & support.

## 24–25. Admin Dashboard и модерация

KPI overview, users/pets/posts/reports/communities/lost&found/businesses/verifications/marketplace,
moderation queue, audit logs, feature flags. Flow: report → авто-классификация severity → queue →
moderator открывает контекст → action → audit log → уведомление → апелляция = новый case.

## 26. Ключевые user flows

- **Регистрация:** Landing → Sign up → City → Pet (skip allowed) → Interests → Local feed → Suggested community → Home.
- **Первый пост:** Home → Create → Post → Media → Caption → Audience → Publish → Optimistic success → Feed.
- **Найти друга:** Explore → Nearby → Filters → Pet card → Profile → Friend/Message → Optional Walk.
- **Создать прогулку:** Create → Walk → Pet → Date/time → Place → Capacity → Publish → Share to relevant communities.
- **Потеряшка:** Create → Lost Pet → Photo → Last seen → Description → Contact method → Publish → Local alerts → Sightings → Reunited.
- **Приют:** Explore → Adoption → Animal → Shelter profile → Contact/Application.
- **Услуга:** Explore → Services → Category → Business → Service → Contact/Booking.

## 27. Компонентная система UI

Button (primary/secondary/ghost/destructive), Input/Search/Select/Date/Time/Location,
Avatar/PetAvatar, PetCard, PostCard, CommunityCard, EventCard, WalkCard, BusinessCard, ListingCard,
StoryAvatar, NotificationRow, ChatBubble, BottomSheet, Modal, Toast, Tabs, FilterDrawer, MapMarker,
Skeleton, EmptyState, ErrorState.

## 28. Дизайн-система

Modern, premium, warm, но не «детский зоомагазин». Большие фото питомцев. Светлая база + тёмная
тема на следующем этапе. 8pt spacing, consistent radius tokens, motion только для feedback/навигации,
комфортные touch targets, обязательные контраст/accessibility. См. `design-reference.png`.

## 29. API / backend layers

Presentation/API, Auth & Identity, User/Pet domain, Social domain, Community domain, Messaging
domain, Discovery/Geo domain, Events/Walks domain, Lost & Found domain, Business/Services domain,
Marketplace domain, Moderation/Safety domain, Notification domain, Billing domain (Phase 3).
Workers: media, notifications, moderation, search indexing.

## 30. Sprint Plan (из документа-первоисточника)

Sprint 0 Foundation → Sprint 1 Identity+Pets → Sprint 2 Social → Sprint 3 Communities+Chat →
Sprint 4 Discovery → Sprint 5 Walks+Events → Sprint 6 Lost & Found → Sprint 7 Safety+Admin →
Sprint 8 Polish+Launch.

## 31. MVP Release Gates

Нет критических P0/P1 багов; critical flows покрыты E2E; permissions проверены для каждой роли;
удалённые/приватные данные недоступны через API; Lost & Found работает end-to-end; realtime chat
стабилен; push notifications протестированы; backups/restore проверены; monitoring/alerting
активны; admin может остановить злоупотребление без доступа к БД; есть Terms/Privacy/Guidelines.

## 32–34. Roadmap и KPI

Недели 1–4: исправления, retention, локальная плотность. Месяцы 2–3: Health, Adoption, Services,
Map. Месяцы 3–6: Marketplace, Booking, Business Pro. После PMF: Reels, AI, Premium, новые города.

**Главный KPI** — не число регистраций, а число пользователей, регулярно получающих локальную
ценность (читают/публикуют, участвуют в сообществах, находят прогулки/события, используют
Lost & Found). PetSocial = единая операционная система для жизни с питомцем:
Social → Community → Nearby → Care → Safety → Services.
