**PetSocial 3.0\
**Полное техническое задание на разработку социальной платформы для
владельцев животных

*Web / PWA • Mobile-first • Serbia-first • масштабирование на другие
страны*

# 1. Резюме продукта

PetSocial --- социальная платформа, построенная вокруг жизни с домашним
животным. Продукт объединяет в одном интерфейсе функции, которые сегодня
разрознены между Telegram-чатами, социальными сетями, картами,
каталогами услуг и досками объявлений.

Ключевой принцип: главным социальным объектом является не только
человек, но и его питомец. У каждого животного есть профиль, социальные
связи, публикации, события, друзья, приватные данные здоровья и история
жизни.

-   Локальные сообщества и чаты по породам, районам и интересам.

-   Профили питомцев и владельцев.

-   Поиск питомцев рядом и совместные прогулки.

-   Потерянные и найденные животные с гео-уведомлениями.

-   События, pet-friendly места и карта.

-   Каталог специалистов и услуг.

-   Приюты, усыновление и волонтёрство.

-   Health / Pet Passport / документы / напоминания.

-   Marketplace.

-   Система доверия, жалоб и модерации.

# 2. Цели

-   Создать более удобную альтернативу разрозненным Telegram-чатам для
    владельцев животных.

-   Сформировать сильную локальную сеть: человек → питомец → район →
    сообщество → услуги.

-   Дать пользователю ежедневную полезность, а не только развлекательную
    ленту.

-   Создать основу для масштабирования из Сербии на другие рынки.

-   Монетизировать бизнес-профили, продвижение и дополнительные сервисы,
    не ограничивая базовую социальную функциональность.

# 3. Целевая аудитория

-   Владельцы собак и кошек --- основной сегмент MVP.

-   Владельцы других домашних животных --- второй сегмент.

-   Приюты и rescue-организации.

-   Ветеринары и клиники.

-   Грумеры, кинологи, догситтеры, передержки, pet hotels.

-   Pet-friendly заведения и магазины.

-   Волонтёры и локальные сообщества.

# 4. Роли и права

**Guest ---** Просмотр публичных страниц, поиск ограниченного набора
публичного контента, регистрация.

**User ---** Профиль, питомцы, публикации, подписки, сообщения,
сообщества, события, прогулки, потеряшки.

**Pet Owner / Caregiver ---** Управление профилем конкретного питомца в
соответствии с назначенными правами.

**Community Moderator ---** Модерация конкретного сообщества.

**Community Admin ---** Полное управление сообществом, модераторами,
правилами, контентом и чатами.

**Business ---** Профессиональная страница, услуги, расписание, отзывы и
продвижение.

**Shelter / Organization ---** Профиль организации, животные, adoption,
волонтёрские задачи и публикации.

**Verified Expert ---** Подтверждённый специалист с экспертным профилем
и ответами.

**Moderator ---** Глобальная модерация контента и пользователей.

**Admin ---** Полный доступ к панели управления.

**Super Admin ---** Системные настройки, роли, биллинг, feature flags и
критические операции.

# 5. Информационная архитектура

-   Home

-   Explore / Search

-   Create

-   Messages

-   Notifications

-   Profile

-   Pets

-   Communities

-   Nearby

-   Walks

-   Events

-   Lost & Found

-   Map

-   Services

-   Adoption

-   Marketplace

-   Health

-   Admin

# 6. Авторизация и onboarding

-   Регистрация: email, телефон, Google, Apple.

-   Подтверждение email/телефона при необходимости.

-   Username должен быть уникальным.

-   Выбор города и языка.

-   Выбор интересов: виды животных, породы, сообщества, услуги.

-   Добавление первого питомца можно пропустить.

-   Запрос геолокации --- только после объяснения пользы и с
    возможностью отказа.

-   Privacy settings доступны с первого дня.

# 7. Профиль пользователя

-   Avatar, имя, username, город, bio.

-   Followers / Following / Friends.

-   Pets.

-   Posts / Media / Saved.

-   Communities.

-   Настройки приватности.

-   Blocked users.

-   Публичный или приватный профиль.

# 8. Профиль питомца

-   Имя, фото, вид, порода, пол, дата рождения, возраст.

-   Город и приблизительный район без раскрытия точной геопозиции.

-   Окрас, размер, вес.

-   Характер и уровень активности.

-   Интересы и особенности.

-   Публикации и фотографии.

-   Друзья питомца.

-   События.

-   Memories / Timeline.

-   Health --- приватный раздел.

-   Documents --- приватный раздел.

-   QR Pet Passport.

# 9. Социальный граф

-   User follows User.

-   User follows Pet.

-   User follows Community.

-   Pet ↔ Pet friendship.

-   User ↔ User friendship.

-   User ↔ Pet ownership/caregiver relationship.

-   Community membership.

-   Event attendance.

-   Blocked / muted relationships.

# 10. Лента

-   Посты пользователей, питомцев и сообществ.

-   Фото, видео, текст, место, опрос, вопрос, потеряшка, adoption post.

-   Likes / reactions / comments / replies / shares / saves.

-   Публикация от имени пользователя или питомца.

-   Сортировка: Recommended, Following, Nearby, Community.

-   Пагинация или cursor-based infinite scroll.

-   Скрытие/мьют автора, сообщества или темы.

-   Контентные рекомендации должны учитывать location, pet profile,
    interests и поведение.

# 11. Stories и короткие видео

-   Stories живут 24 часа.

-   Фото, видео, текст, location, stickers.

-   Просмотры и базовая аналитика автора.

-   На следующем этапе --- вертикальная лента Pet Reels.

-   Ограничение размера и длительности видео конфигурируется сервером.

# 12. Сообщества

-   Публичные, по запросу и приватные сообщества.

-   Название, slug, описание, avatar, cover, правила.

-   Тематика: порода, город, район, помощь, обучение, досуг и т.д.

-   Feed, Chat, Members, Events, Media, Guides, Lost & Found.

-   Роли Owner / Admin / Moderator / Member.

-   Закреплённые публикации.

-   Модерация сообщений и контента.

-   Community Wiki / Guides.

-   Опросы и объявления администрации.

# 13. Чаты и сообщения

-   1-to-1 messaging.

-   Групповые чаты внутри сообществ.

-   Текст, фото, видео, GIF, реакции, reply, mentions.

-   Voice messages --- post-MVP.

-   Read/unread status.

-   Typing indicator.

-   Online presence --- опционально.

-   Mute, archive, block, report.

-   WebSocket realtime.

-   Медиа хранить отдельно от основной БД.

# 14. Nearby

-   Поиск питомцев в радиусе.

-   Поиск людей с питомцами.

-   Фильтры по виду, породе, возрасту, полу, активности.

-   Точное местоположение никогда не показывать другим пользователям.

-   Использовать coarse geolocation / geohash.

-   Пользователь может полностью отключить отображение в Nearby.

# 15. Pet Match и совместные прогулки

-   Создание цели: ищу друга / прогулку / playdate.

-   Фильтры: порода, размер, возраст, активность, район, расстояние.

-   Match score --- рекомендация, а не гарантия совместимости.

-   Создание публичной или приватной Walk.

-   Дата, время, место, количество участников.

-   Join / Leave / Invite.

-   Безопасное общение через платформу.

# 16. Events

-   Meetups, training, shows, charity, photo sessions, community events.

-   Название, описание, дата, время, место, организатор, cover.

-   Public / private.

-   Going / Interested / Cancel.

-   Ограничение количества участников.

-   Комментарии и чат события.

-   Напоминания.

# 17. Lost & Found

-   Создание Lost Pet / Found Pet.

-   Фото, вид, порода, описание, особые приметы.

-   Последняя известная точка и время.

-   Контакт через внутренний messenger.

-   Геозона уведомлений.

-   Пользователи могут сообщать о sighting.

-   Статусы: Active, Sighted, Reunited, Closed.

-   Автоматическое снятие активного статуса после подтверждения
    владельца.

-   AI image similarity --- только как вспомогательное совпадение, без
    заявления о точной идентификации.

# 18. Adoption и Shelters

-   Профили приютов и rescue-организаций.

-   Карточки животных.

-   Статусы: Available, Reserved, Adopted.

-   Фильтры.

-   Application / Contact flow.

-   Волонтёрские задачи.

-   Публикации и события.

-   Внешние или встроенные ссылки на пожертвования.

# 19. Health и Pet Passport

-   Vaccinations.

-   Parasite treatments.

-   Medications.

-   Weight history.

-   Vet contacts.

-   Private medical notes.

-   Documents.

-   Reminders.

-   QR-код профиля.

-   Медицинские данные по умолчанию приватны.

-   Система не ставит диагнозы и не заменяет ветеринара.

# 20. Services / Business

-   Категории: Veterinary, Grooming, Walking, Sitting, Hotels, Training,
    Transport, Photography.

-   Business profile с описанием, фото, адресом, графиком, услугами.

-   Verified status.

-   Reviews and ratings.

-   Contact.

-   В дальнейшем --- booking и availability.

-   Продвижение профиля и услуг.

# 21. Map

-   Pet-friendly places.

-   Dog parks.

-   Veterinary clinics.

-   Groomers.

-   Pet hotels.

-   Pet shops.

-   Events.

-   Lost & Found.

-   Карта не должна раскрывать точные координаты частных пользователей.

# 22. Marketplace

-   Sell / Buy / Give away / Wanted.

-   Категории товаров.

-   Фото, цена, состояние, location, описание.

-   Внутренний messenger.

-   Report listing.

-   Избранное.

-   На MVP --- без хранения пользовательских денег.

-   Коммерческие платежи и комиссии --- отдельный этап.

# 23. Trust & Safety

-   Email/phone verification.

-   Verified Business / Expert / Organization.

-   Trust indicators.

-   Block / Mute / Report.

-   Rate limiting.

-   Anti-spam.

-   Модерация изображений и текста.

-   Система предупреждений и санкций.

-   Audit log для административных действий.

-   Защита от раскрытия телефона и точного адреса.

# 24. Модерация

-   Report User / Pet / Post / Comment / Message / Community / Listing.

-   Причины: spam, scam, harassment, illegal content, animal abuse,
    prohibited sale, other.

-   Очередь модерации.

-   Приоритет по severity.

-   Actions: dismiss, hide, remove, warn, suspend, ban.

-   Автоматические флаги AI/heuristics --- только как помощь модератору.

-   История решений.

# 25. Уведомления

-   Social: likes, comments, follows, messages.

-   Pet: reminders, events, health.

-   Local: nearby events, walks, lost pets.

-   Community: new posts, announcements.

-   Security: login, password, suspicious activity.

-   Push, in-app, email --- пользователь управляет категориями.

# 26. Search

-   Users.

-   Pets.

-   Communities.

-   Posts.

-   Events.

-   Businesses.

-   Places.

-   Lost & Found.

-   Filters по городу, породе, категории и расстоянию.

-   Autocomplete и recent searches.

# 27. Recommendations

-   Рекомендации питомцев рядом.

-   Рекомендации сообществ.

-   Рекомендации событий.

-   Рекомендации специалистов.

-   Feed ranking.

-   Signals: follows, likes, comments, saves, views, location, pet
    profile, community membership.

-   Не использовать чувствительные персональные данные для рекомендаций.

# 28. Privacy

-   Public / Private account.

-   Visibility settings для питомцев.

-   Отдельные настройки Health и Documents.

-   Скрытие Nearby.

-   Блокировка пользователей.

-   Удаление аккаунта и экспорт основных пользовательских данных.

-   Минимизация хранения PII.

-   Не показывать точный домашний адрес или точные координаты.

# 29. Административная панель

-   Dashboard: users, active users, posts, reports, communities, lost
    pets, businesses.

-   User management.

-   Pet management.

-   Content moderation.

-   Community moderation.

-   Business verification.

-   Shelter verification.

-   Reports queue.

-   Feature flags.

-   Audit logs.

-   Basic analytics.

-   Role management.

# 30. Аналитика

-   DAU / WAU / MAU.

-   Registration conversion.

-   Onboarding completion.

-   Pets created per user.

-   Posts per active user.

-   Community joins.

-   Messages sent.

-   Walks/events created and joined.

-   Lost-pet cases and reunions.

-   Search success rate.

-   Retention D1 / D7 / D30.

-   Premium/business conversion на следующих этапах.

# 31. Нефункциональные требования

-   Mobile-first responsive UI.

-   PWA.

-   Modern browsers: последние 2 версии Chrome, Safari, Firefox, Edge.

-   iOS/Android mobile web.

-   API-first architecture.

-   Cursor pagination для лент и списков.

-   CDN для media.

-   Image resize / WebP or AVIF.

-   Video transcoding --- отдельный media worker.

-   Redis cache.

-   Background jobs.

-   Centralized logging.

-   Monitoring and error tracking.

-   Automated backups.

-   Database migrations.

-   Staging + production environments.

# 32. Рекомендуемый стек

-   Frontend: Next.js + TypeScript.

-   UI: Tailwind CSS + component system.

-   PWA: service worker + manifest.

-   Backend: NestJS + TypeScript.

-   Database: PostgreSQL + PostGIS.

-   Cache / queues: Redis.

-   Realtime: WebSocket / Socket.IO.

-   Search: PostgreSQL FTS на MVP, OpenSearch при росте.

-   Object storage: S3-compatible.

-   CDN: любой production-grade CDN.

-   Maps: провайдер с поддержкой Serbia и reverse geocoding.

-   Auth: secure session/JWT architecture.

-   CI/CD: GitHub Actions или аналог.

# 33. Базовая модель данных

**User ---** id, username, email, phone, avatar, bio, city_id, privacy,
status, created_at

**Pet ---** id, owner_id, name, species, breed_id, sex, birth_date,
weight, traits, visibility, status

**PetCaregiver ---** pet_id, user_id, role, permissions

**PetHealthRecord ---** id, pet_id, type, title, date, notes, visibility

**PetDocument ---** id, pet_id, type, file_url, metadata, visibility

**Post ---** id, author_user_id, author_pet_id, community_id, type,
text, location, status, created_at

**Media ---** id, owner_type, owner_id, file_url, type, width, height,
duration

**Comment ---** id, post_id, author_id, parent_id, text, status

**Reaction ---** id, user_id, target_type, target_id, type

**Follow ---** follower_id, target_type, target_id

**Friendship ---** user/pet relation, status, created_at

**Community ---** id, owner_id, name, slug, description, visibility,
status

**CommunityMember ---** community_id, user_id, role, status

**Conversation ---** id, type, community_id, created_at

**Message ---** id, conversation_id, sender_id, text, media_id,
created_at

**Event ---** id, organizer_id, community_id, title, start_at, end_at,
location, capacity

**Walk ---** id, organizer_id, pet_id, location, start_at, capacity,
visibility

**LostPetCase ---** id, pet_id, type, last_seen_location, last_seen_at,
description, status

**Business ---** id, owner_id, category, name, description, location,
verification_status

**Service ---** id, business_id, category, title, price_from, duration

**Review ---** id, author_id, business_id, rating, text, status

**Listing ---** id, seller_id, category, title, price, condition,
location, status

**Report ---** id, reporter_id, target_type, target_id, reason,
severity, status

**Notification ---** id, user_id, type, payload, read_at, created_at

# 34. API --- основные группы

-   POST /auth/register, /auth/login, /auth/logout, /auth/verify.

-   GET/PATCH /users/:id.

-   GET/POST/PATCH /pets.

-   GET/POST /posts, /posts/:id/comments, /posts/:id/reactions.

-   GET/POST /communities, /communities/:id/members.

-   GET/POST /conversations, /conversations/:id/messages.

-   GET/POST /events.

-   GET/POST /walks.

-   GET/POST /lost-found.

-   GET /search.

-   GET /nearby.

-   GET/POST /businesses, /services, /reviews.

-   GET/POST /marketplace/listings.

-   GET/POST /reports.

-   GET /notifications.

-   Admin API должна быть отделена правами RBAC.

# 35. Realtime events

-   message.created

-   message.read

-   conversation.typing

-   notification.created

-   post.reaction.created

-   comment.created

-   community.member.joined

-   event.participant.joined

-   lostpet.sighting.created

-   moderation.status.changed

# 36. Безопасность

-   TLS everywhere.

-   Password hashing через современный адаптивный алгоритм.

-   Secure cookies / token rotation.

-   CSRF protection для cookie-based flows.

-   XSS / SQL injection / SSRF protection.

-   Rate limiting.

-   Upload validation и malware scanning.

-   Signed media URLs при необходимости.

-   RBAC.

-   Audit log.

-   Secrets только через secret manager/environment.

-   Регулярные dependency/security updates.

# 37. UX / UI требования

-   Mobile-first.

-   Нижняя навигация: Home, Explore, Create, Messages, Profile.

-   Desktop: sidebar + central content + contextual right panel.

-   Большие фотографии животных.

-   Мягкие скругления, clean typography, лёгкие анимации.

-   Не использовать визуальный стиль детского зоомагазина.

-   Пустые состояния должны объяснять следующий шаг.

-   Skeleton loading.

-   Optimistic UI для реакций и быстрых действий.

-   Accessibility: keyboard navigation, focus states, alt text,
    contrast.

# 38. Монетизация

-   Бесплатная базовая социальная сеть.

-   PetSocial Premium --- дополнительные функции.

-   Business subscription.

-   Promoted listings.

-   Promoted services.

-   Promoted communities/events.

-   Платные расширенные инструменты для бизнеса.

-   На MVP не хранить деньги пользователей и не строить сложный wallet.

# 39. MVP --- обязательный scope

-   Auth + onboarding.

-   User profile.

-   Pet profile.

-   Feed.

-   Posts / media / comments / reactions.

-   Follow system.

-   Communities + basic group chat.

-   1-to-1 messaging.

-   Search.

-   Nearby pets.

-   Walks.

-   Events.

-   Lost & Found.

-   Notifications.

-   Reports / blocking.

-   Admin panel.

-   PWA.

-   Analytics.

-   Localization: Serbian / Russian / English.

# 40. Phase 2

-   Health.

-   Pet Passport.

-   Documents.

-   Memories.

-   Adoption.

-   Shelters.

-   Business profiles.

-   Services.

-   Reviews.

-   Map.

-   Pet-friendly places.

-   Marketplace.

# 41. Phase 3

-   Pet Match.

-   Reels.

-   AI moderation.

-   AI lost-pet similarity.

-   Advanced recommendations.

-   QR Pet Passport.

-   Premium.

-   Business subscriptions.

-   Promotion platform.

-   Booking.

-   Advanced analytics.

# 42. Acceptance criteria MVP

1.  Новый пользователь может зарегистрироваться менее чем за несколько
    минут.

2.  Пользователь может создать минимум один профиль питомца.

3.  Пользователь может опубликовать фото/текстовый пост и
    взаимодействовать с ним.

4.  Пользователь может найти и вступить в публичное сообщество.

5.  Участники сообщества могут обмениваться сообщениями в realtime.

6.  Пользователь может найти питомцев рядом без раскрытия точных
    координат.

7.  Пользователь может создать прогулку и присоединиться к ней.

8.  Пользователь может создать объявление Lost/Found и получить
    локальные уведомления.

9.  Пользователь может заблокировать другого пользователя и отправить
    жалобу.

10. Администратор может просматривать жалобы и применять санкции.

11. Push/in-app уведомления работают по пользовательским настройкам.

12. Основные экраны корректно работают на iPhone/Android и desktop.

13. Все критические действия логируются.

14. Сервис не хранит пользовательские деньги в MVP.

# 43. Приоритеты разработки

-   P0 --- Auth, User, Pet, Feed, Communities, Chat, Search,
    Notifications, Moderation, Admin.

-   P1 --- Nearby, Walks, Events, Lost & Found.

-   P2 --- Health, Passport, Adoption, Services, Map, Marketplace.

-   P3 --- AI, Reels, Premium, Booking, advanced recommendations.

# 44. Ключевые продуктовые метрики

-   Activation: пользователь создал питомца и совершил первое социальное
    действие.

-   D1/D7/D30 retention.

-   Среднее число сессий на пользователя.

-   Posts / active user.

-   Community join rate.

-   Chat participation.

-   Walk/event participation.

-   Lost-pet response rate.

-   Search-to-action conversion.

-   Business lead conversion.

# 45. Принцип продукта

PetSocial не должен выглядеть как копия Instagram или Telegram.
Социальная лента --- только один слой. Главный продуктовый цикл: питомец
→ люди рядом → сообщества → общение → прогулки/события → услуги →
полезность → возвращение в приложение.

Ключевая формулировка продукта: «Всё для жизни с питомцем --- в одном
месте».

Первый рынок рекомендуется запускать локально, например в Сербии, с
сильной географической составляющей. После проверки retention и
плотности локальных сообществ архитектура должна позволять запускать
новые города и страны без переделки ядра.

# 46. Результат разработки

-   Production-ready Web/PWA.

-   Responsive UI.

-   Backend API.

-   PostgreSQL schema + migrations.

-   Realtime messaging.

-   Admin panel.

-   Moderation system.

-   Object storage/media pipeline.

-   Push notifications.

-   Analytics events.

-   Localization.

-   Deployment documentation.

-   Environment configuration.

-   API documentation.

-   QA checklist и acceptance test suite.

# 47. PetSocial 4.0 --- продуктовые улучшения сверх MVP

Эта версия добавляет механики, которые превращают набор функций в
устойчивую локальную сеть: персональный Pet Hub, локальные сигналы,
доверие, безопасные знакомства, умные сценарии, контентные петли и
инструменты роста сообществ.

-   Pet Hub --- единая стартовая панель конкретного питомца: здоровье,
    ближайшие события, прогулки, друзья, напоминания, документы и
    последние публикации.

-   Household --- домохозяйство: несколько людей совместно управляют
    несколькими питомцами.

-   Pet Caregiver permissions: Owner, Family, Walker, Sitter с разными
    правами.

-   Quick Actions: Add post, Find walk, Report lost pet, Vet, Reminder,
    Event.

-   Activity Center --- единый журнал действий по питомцу.

-   Saved places и любимые специалисты.

-   Мультипитомец: один пользователь может управлять несколькими
    животными без переключения аккаунтов.

# 48. Локальная сеть --- главный growth engine

-   City Feed: контент и события конкретного города.

-   District Feed: районные сообщества.

-   Breed Feed: лента породы.

-   Nearby Pulse: агрегированные события рядом без раскрытия
    персональных координат.

-   Local Trending: популярные посты, события и места района.

-   Local Alerts: потеряшки и важные сообщения с географической
    релевантностью.

-   При запуске нового города система должна автоматически создавать
    базовые категории и предлагать пользователям локальные сообщества.

# 49. Улучшенная механика сообществ

-   Community onboarding: правила, welcome message, рекомендуемые темы.

-   Topics: внутри большого сообщества посты распределяются по темам.

-   FAQ / Wiki / Guides.

-   Community calendar.

-   Member badges: Admin, Moderator, Expert, Verified, Active Member.

-   Slow mode и антиспам.

-   Возможность ограничить создание постов новичками на заданный срок.

-   Community health metrics: active members, unanswered questions,
    reports.

-   Рекомендации администраторам: какие темы получают много вопросов и
    где не хватает закреплённой информации.

# 50. Вопросы без ответа

Отдельный алгоритмический слой: система обнаруживает вопросы, на которые
никто не ответил, и показывает их подходящим участникам или verified
experts.

-   Unanswered Questions.

-   Notify relevant experts.

-   Лучший ответ можно отметить как Accepted Answer.

-   Accepted Answer не является медицинской гарантией и сопровождается
    корректным disclaimer.

# 51. Безопасные знакомства и прогулки

-   Первый контакт через внутренний чат.

-   Не показывать домашний адрес.

-   Для публичной прогулки использовать общественное место.

-   Организатор видит список участников.

-   Возможность отменить встречу и пожаловаться.

-   Safety checklist перед первой встречей.

-   После встречи --- опциональная оценка организации события, а не
    обязательная оценка человека.

-   Для несовершеннолетних пользователей --- отдельные ограничения и
    запрет на публичное раскрытие возраста/контактов.

# 52. Умные сценарии

-   Если пользователь добавил питомца, предложить заполнить базовый
    профиль.

-   Если пользователь указал район и породу --- предложить релевантное
    сообщество.

-   Если часто посещает прогулки --- предложить ближайшие Walks.

-   Если питомец потерян --- автоматически предложить Lost Mode.

-   Если создано событие --- предложить поделиться в релевантных
    сообществах.

-   Если пользователь публикует вопрос, определить подходящие
    темы/сообщества.

-   Никаких агрессивных push-уведомлений: частота и категории
    контролируются пользователем.

# 53. Lost Mode

Отдельный режим аккаунта/питомца при пропаже.

-   Один переключатель активирует экстренный сценарий.

-   Автоматически создаётся черновик Lost Pet.

-   Показывается чек-лист действий.

-   Предлагается уведомить релевантные локальные сообщества.

-   Уведомления отправляются только в релевантной геозоне.

-   Система показывает статус поисковой операции.

-   После Reunited создаётся история события с возможностью скрыть
    детали.

# 54. Pet ID / QR

-   Публичная страница QR не раскрывает телефон, адрес или приватные
    данные.

-   Нашедший может отправить владельцу сообщение.

-   Можно указать безопасную контактную форму.

-   QR может быть распечатан на жетоне.

-   Владелец может мгновенно деактивировать QR.

# 55. Контентные форматы 2.0

-   Post.

-   Question.

-   Poll.

-   Guide.

-   Event.

-   Lost / Found.

-   Adoption.

-   Review.

-   Recommendation.

-   Before / After --- для grooming/training без медицинских обещаний.

-   Story.

-   Short video.

# 56. Репутация контента

-   Helpful reaction для полезных ответов.

-   Accepted Answer.

-   Verified Expert Answer.

-   Community-approved guide.

-   Система должна отличать engagement от полезности, чтобы спам не
    побеждал качественный контент.

# 57. Anti-spam / Anti-abuse 2.0

-   Rate limits на регистрацию, сообщения, комментарии, создание
    сообществ и объявления.

-   Поведенческие сигналы для выявления массовой активности.

-   Duplicate-content detection.

-   Suspicious link detection.

-   Flood control в чатах.

-   Shadow queue для подозрительного контента до решения модератора.

-   Механизм апелляции.

-   Прозрачные причины санкций.

-   Администратор не может удалить audit log.

# 58. Content lifecycle

-   Draft → Published → Edited → Hidden/Removed → Archived.

-   Soft delete для большинства пользовательских объектов.

-   Hard delete только по политике хранения/требованию удаления.

-   Version history для важных объектов: Guides, Community rules,
    Business profiles.

-   Удалённый контент должен быть недоступен обычным API даже при
    наличии старого URL.

# 59. Data ownership и экспорт

-   Пользователь может запросить экспорт своих основных данных.

-   Пользователь может удалить аккаунт.

-   Перед удалением показать последствия для сообществ и питомцев.

-   Можно передать роль caregiver другому пользователю.

-   При удалении владельца питомца должен существовать безопасный
    сценарий передачи управления.

# 60. Search 2.0

-   Typo tolerance.

-   Synonyms по видам животных и категориям.

-   Breed aliases.

-   Serbian / Russian / English search normalization.

-   Geo-aware ranking.

-   Search suggestions.

-   Search history.

-   Saved searches.

-   Уведомления по Saved Search для релевантных новых
    объявлений/питомцев.

# 61. SEO и публичный web

-   Публичные профили животных, сообществ, бизнеса и pet-friendly мест
    могут иметь индексируемые страницы.

-   Private profiles и приватные сообщества не индексируются.

-   SSR/metadata/OpenGraph.

-   Человеко-читаемые URLs.

-   Sitemap и robots rules.

-   Structured data там, где это корректно.

-   Share cards для социальных сетей и мессенджеров.

# 62. Deep links

-   Ссылки вида /pet/\..., /community/\..., /event/\..., /business/\...,
    /lost/\....

-   Открытие соответствующего экрана в PWA.

-   При отсутствии авторизации публичная часть открывается без
    регистрации.

-   После авторизации пользователь возвращается на исходный объект.

# 63. Onboarding 2.0

-   Не спрашивать всё сразу.

-   Первый экран: город + вид животного.

-   Второй: имя питомца.

-   Третий: интересы.

-   После регистрации сразу показать локальную ленту и релевантное
    сообщество.

-   Профиль дополняется постепенно.

-   Progress indicator должен показывать пользу, а не заставлять
    заполнять длинную анкету.

# 64. Retention loops

-   Pet loop: пост → реакция → новый контент.

-   Local loop: Nearby → Walk → Event → Community.

-   Utility loop: Reminder → Pet Hub → Health.

-   Safety loop: Lost alert → Sighting → Reunited.

-   Community loop: Question → Answer → Reputation.

-   Business loop: profile → lead → review → better ranking.

# 65. Business model 2.0

-   Business Free --- базовая страница.

-   Business Pro --- расширенный профиль, услуги, аналитика.

-   Featured placement --- платное продвижение с явной маркировкой.

-   Sponsored event.

-   Sponsored community post.

-   Premium tools для бизнеса.

-   Важное правило: платное продвижение не должно маскироваться под
    органическую рекомендацию.

# 66. Геймификация без превращения в игру

-   Helpful Member.

-   Local Helper.

-   Lost Pet Helper.

-   Community Contributor.

-   Event Organizer.

-   Verified Expert.

-   Pet Explorer.

-   Награды должны отражать полезность, а не просто количество кликов.

# 67. Финансовая архитектура

-   На MVP не хранить пользовательские деньги.

-   Подписки PetSocial и Business могут быть отдельным биллинговым
    модулем.

-   Платёжные данные не хранить в своей БД --- использовать провайдера
    платежей.

-   Комиссии, возвраты и налоги должны быть вынесены в отдельный billing
    domain.

-   Реклама и продвижение должны иметь отдельные campaign entities.

# 68. Feature Flags

-   Каждая крупная функция включается через feature flag.

-   Flags для города, страны, роли и версии клиента.

-   Можно включать функцию для ограниченного процента пользователей.

-   Emergency kill switch для проблемной функции.

-   Эксперименты не должны ломать основную навигацию.

# 69. QA и тестирование

-   Unit tests для бизнес-логики.

-   Integration tests для API.

-   E2E tests для критических user journeys.

-   Realtime tests.

-   Upload/security tests.

-   Permission matrix tests.

-   Мобильное тестирование iOS Safari и Android Chrome.

-   Load tests для Feed, Search и Messaging.

-   Regression suite перед каждым production release.

# 70. Критические user journeys для E2E

-   Регистрация → onboarding → создание питомца → первый пост.

-   Создание сообщества → вступление → публикация → сообщение.

-   Поиск питомца рядом → профиль → безопасный контакт.

-   Создание Walk → join → уведомление.

-   Создание Lost Pet → локальное уведомление → sighting → reunited.

-   Создание Business → верификация → публикация услуги → lead.

-   Report → moderation queue → action → уведомление пользователя.

-   Удаление аккаунта → проверка доступа к удалённым данным.

# 71. Производительность

-   Первый контент ленты должен появляться быстро даже на мобильной
    сети.

-   Lazy loading изображений.

-   Responsive images.

-   CDN.

-   Кэширование публичных страниц.

-   Cursor pagination.

-   Background processing для видео, thumbnails, notifications и AI
    tasks.

-   Тяжёлые аналитические запросы не выполнять на production request
    path.

# 72. Observability

-   Structured logs.

-   Error tracking.

-   Metrics.

-   Tracing для критических API.

-   Health checks.

-   Queue monitoring.

-   Storage monitoring.

-   Alerts для ошибок, latency, очередей и базы данных.

-   Admin incident timeline.

# 73. Disaster Recovery

-   Автоматические резервные копии БД.

-   Проверка восстановления из backup.

-   Versioned object storage для критических данных.

-   Документированный recovery procedure.

-   RPO/RTO задаются до production launch.

-   Критические конфигурации хранятся вне application container.

# 74. Архитектурный принцип

Система должна быть modular monolith на старте, а не набором
микросервисов. Домены разделяются на уровне кода и БД-слоя, но
разворачиваются проще. При росте отдельными workers/services выносятся
media processing, search, notifications, moderation и recommendation
workloads.

Это снижает стоимость первой версии и позволяет постепенно
масштабировать только реальные узкие места.

# 75. Финальная продуктовая формула

PetSocial = Social Network + Local Communities + Pet Profiles + Nearby +
Walks + Events + Lost & Found + Pet Care + Services.

Главный moat продукта --- не отдельная функция, а плотность локальной
сети: чем больше владельцев, питомцев, сообществ, событий и локальных
сервисов в конкретном городе, тем полезнее продукт для следующего
пользователя.

# 76. Обновлённый MVP после улучшений

-   P0: Auth, onboarding, User, Pet, Feed, communities, chats, search,
    notifications, moderation, admin.

-   P1: Nearby, Walks, Events, Lost & Found, local alerts, deep links,
    SEO/public pages.

-   P2: Health, Pet Passport, household/caregiver, adoption,
    business/services, map.

-   P3: Marketplace, booking, Reels, AI moderation, image similarity,
    Premium, Business Pro.

-   До масштабирования на новые страны сначала доказать retention и
    локальную плотность хотя бы в одном рынке/нескольких городах.

# 77. Definition of Done для MVP

-   Функция имеет UI, API, permissions, validation, analytics events и
    error states.

-   Есть mobile и desktop states.

-   Есть loading, empty, success и failure states.

-   Есть audit trail для административных действий.

-   Есть unit/integration/E2E coverage для критического пути.

-   Есть документация для разработчика и QA.

-   Есть staging deployment.

-   Есть rollback procedure.

-   Функция не раскрывает приватные данные и не обходит RBAC.

Версия документа: PetSocial 4.0. Назначение: продуктовая и инженерная
база для разработки. Приоритет: сначала локальная социальная сеть и
безопасность, затем utility-функции и монетизация.
