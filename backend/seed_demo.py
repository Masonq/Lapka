"""
Наполняет базу демо-данными: пользователи, питомцы, посты всех типов, объявления
барахолки, сообщество, событие, исполнитель услуг с отзывом.

Идемпотентно по email — повторный запуск не создаст дублей пользователей (просто
пропустит уже существующих), но каждый раз добавляет им новые посты/объявления.
Если нужно добавить контента ещё раз для уже существующих демо-пользователей —
просто запусти снова, посты задублируются (это ожидаемо для повторных запусков
ради "оживления" ленты, не для продакшен-данных).

Все демо-аккаунты используют почту вида demo-*@petsocial.example — легко найти и
удалить оптом через SQL, если понадобится (WHERE email LIKE 'demo-%@petsocial.example').

Запуск на сервере: docker compose exec -T backend python seed_demo.py
"""
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    AuthProvider, Community, CommunityMember, Event, EventParticipant,
    Listing, Pet, Post, PostType, ServiceProvider, ServiceReview, ServiceType, User,
)

DEMO_PASSWORD = "demo12345"

DEMO_USERS = [
    {"email": "demo-ana@petsocial.example", "name": "Ана Петрович", "city": "Beograd", "bio": "Держим двоих кошек, живём на Врачаре"},
    {"email": "demo-marko@petsocial.example", "name": "Марко Йованович", "city": "Beograd", "bio": "Вест-хайленд-терьер Бела, гуляем в Ушче каждый день"},
    {"email": "demo-jelena@petsocial.example", "name": "Йелена Стоянович", "city": "Beograd", "bio": "Ветеринар, работаю в клинике на Дорчоле"},
    {"email": "demo-nikola@petsocial.example", "name": "Никола Симич", "city": "Novi Sad", "bio": "Кинолог, дрессировка и коррекция поведения"},
    {"email": "demo-milica@petsocial.example", "name": "Милица Джорджевич", "city": "Beograd", "bio": "Волонтёр приюта, пристраиваем котят"},
]


def get_or_create_user(db, email, name, city, bio):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user, False
    user = User(
        display_name=name,
        email=email,
        password_hash=hash_password(DEMO_PASSWORD),
        auth_provider=AuthProvider.EMAIL,
        city=city,
        bio=bio,
    )
    db.add(user)
    db.flush()
    return user, True


def main():
    db = SessionLocal()
    try:
        users = {}
        created_count = 0
        for u in DEMO_USERS:
            user, created = get_or_create_user(db, u["email"], u["name"], u["city"], u["bio"])
            users[u["email"]] = user
            created_count += 1 if created else 0
        db.commit()
        print(f"Пользователи: {len(users)} всего, {created_count} новых")

        ana = users["demo-ana@petsocial.example"]
        marko = users["demo-marko@petsocial.example"]
        jelena = users["demo-jelena@petsocial.example"]
        nikola = users["demo-nikola@petsocial.example"]
        milica = users["demo-milica@petsocial.example"]

        # --- Питомцы ---
        pets_data = [
            (marko, "Бела", "Собака", "Вест-хайленд-терьер", "Девочка", 3, "Beograd", "Активный", "Дружелюбная, обожает гонять мяч в парке"),
            (ana, "Муся", "Кошка", "Британская короткошёрстная", "Девочка", 5, "Beograd", "Спокойный", "Домашняя, любит поспать на подоконнике"),
            (ana, "Барсик", "Кошка", None, "Мальчик", 2, "Beograd", "Средний", None),
        ]
        pets = []
        for owner, name, species, breed, gender, age, city, activity, about in pets_data:
            existing = db.query(Pet).filter(Pet.owner_id == owner.id, Pet.name == name).first()
            if existing:
                pets.append(existing)
                continue
            pet = Pet(
                owner_id=owner.id, name=name, species=species, breed=breed, gender=gender,
                age_years=age, city=city, activity_level=activity, about=about,
            )
            db.add(pet)
            db.flush()
            pets.append(pet)
        db.commit()
        bela = pets[0]
        print(f"Питомцы: {len(pets)}")

        # --- Сообщество ---
        community = db.query(Community).filter(Community.name == "Собаководы Белграда").first()
        if not community:
            community = Community(
                name="Собаководы Белграда",
                description="Встречи, советы по выгулу, обмен опытом — для всех, у кого дома собака",
                city="Beograd",
                created_by=marko.id,
            )
            db.add(community)
            db.flush()
            db.add(CommunityMember(community_id=community.id, user_id=marko.id, role="admin"))
            for u in (ana, jelena):
                db.add(CommunityMember(community_id=community.id, user_id=u.id, role="member"))
            db.commit()
            print("Сообщество создано: Собаководы Белграда")
        else:
            print("Сообщество уже есть: Собаководы Белграда")

        # --- Посты: по одному каждого типа минимум ---
        now = datetime.now(timezone.utc)
        posts_data = [
            (marko, PostType.LOST, "Пропала Бела возле Ташмайдана", "Убежала вечером с поводка возле парка Ташмайдан. Белая, в красном ошейнике, очень дружелюбная, но пугливая с незнакомцами. Если увидите — не бегите за ней, лучше напишите мне.", "Парк Ташмайдан", False),
            (jelena, PostType.FOUND, "Рыжий кот у клиники на Дорчоле", "Уже третий день сидит у входа в ветклинику, ошейника нет, не чипирован. Упитанный, явно домашний — похоже, потерялся, а не бездомный.", "Дорчол, ул. Господар Йованова", False),
            (milica, PostType.ADOPT, "Трое котят ищут дом", "Нашли под лестницей в подъезде, маме помочь не смогли — не вернулась. Котятам около 2 месяцев, здоровы, привиты по возрасту, приучены к лотку. Отдаём только с проверкой условий.", None, False),
            (ana, PostType.QUESTION, "Кто-нибудь возил кошку к стоматологу в Белграде?", "Мусе нужно чистить зубной камень под наркозом. Ищу клинику с опытом именно в стоматологии у кошек, не общую хирургию. Буду благодарна за рекомендации.", None, False),
            (nikola, PostType.GENERAL, "Открыл групповые занятия по коррекции поведения", "По субботам в парке Кошутняк — базовое послушание и работа с реактивностью на поводке. Первое занятие бесплатное, дальше по договорённости.", None, False),
            (marko, PostType.LOST, "Нашлась! Огромное спасибо всем откликнувшимся", "Бела вернулась сама через два дня, слегка похудевшая, но здоровая. Спасибо всем, кто репостил и писал — без вас было бы куда страшнее.", "Парк Ташмайдан", True),
        ]
        posts_created = 0
        for author, ptype, title, body, location, resolved in posts_data:
            existing = db.query(Post).filter(Post.author_id == author.id, Post.title == title).first()
            if existing:
                continue
            post = Post(
                author_id=author.id, type=ptype, title=title, body=body,
                last_seen_location=location, is_resolved=resolved,
                community_id=community.id if author.id == marko.id and ptype == PostType.GENERAL else None,
            )
            db.add(post)
            posts_created += 1
        db.commit()
        print(f"Посты: {posts_created} новых")

        # --- Объявления барахолки ---
        listings_data = [
            (ana, "sell", "аксессуары", "Клетка-переноска для кошки, б/у", "Использовали пару раз для поездок к ветеринару, состояние отличное. Размер M, подходит для кошки до 6 кг.", 2500, "Beograd"),
            (marko, "wanted", "переноски", "Ищу шлейку для вест-хайленд-терьера", "Порода мелкая, стандартные шлейки велики. Если у кого осталась ненужная — куплю или обменяю.", None, "Beograd"),
            (milica, "give_away", "корм", "Отдам сухой корм для котят, начатая упаковка", "Осталось примерно половина пачки, котята выросли и перешли на другой корм. Отдам даром, самовывоз с Новог Београда.", None, "Beograd"),
        ]
        listings_created = 0
        for seller, ltype, category, title, description, price, city in listings_data:
            existing = db.query(Listing).filter(Listing.seller_id == seller.id, Listing.title == title).first()
            if existing:
                continue
            db.add(Listing(
                seller_id=seller.id, type=ltype, category=category, title=title,
                description=description, price=price, city=city,
            ))
            listings_created += 1
        db.commit()
        print(f"Объявления: {listings_created} новых")

        # --- Событие/прогулка ---
        event = db.query(Event).filter(Event.title == "Утренняя прогулка в Кошутняке").first()
        if not event:
            event = Event(
                organizer_id=marko.id, type="walk", title="Утренняя прогулка в Кошутняке",
                description="Собираемся у главного входа, гуляем примерно час. Все собаки дружелюбны, приходите знакомиться",
                location="Парк Кошутняк, главный вход",
                starts_at=now + timedelta(days=3, hours=9),
                pet_id=bela.id,
            )
            db.add(event)
            db.flush()
            db.add(EventParticipant(event_id=event.id, user_id=marko.id, status="going"))
            db.add(EventParticipant(event_id=event.id, user_id=ana.id, status="going"))
            db.commit()
            print("Событие создано: Утренняя прогулка в Кошутняке")
        else:
            print("Событие уже есть: Утренняя прогулка в Кошутняке")

        # --- Исполнитель услуг + отзыв ---
        provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == nikola.id).first()
        if not provider:
            provider = ServiceProvider(
                user_id=nikola.id, service_type=ServiceType.TRAINER,
                description="Кинолог с опытом 7 лет. Базовое послушание, коррекция агрессии и реактивности, подготовка к нормативам.",
                price_from=2500, contact="+381 63 123 4567",
            )
            db.add(provider)
            nikola.is_service_provider = True
            db.flush()
            db.add(ServiceReview(
                provider_id=provider.id, author_id=marko.id, rating=5,
                body="Бела перестала лаять на других собак после трёх занятий. Никола объясняет понятно, без воды.",
            ))
            provider.rating_avg = 5.0
            provider.rating_count = 1
            db.commit()
            print("Исполнитель услуг создан: Никола Симич (кинолог)")
        else:
            print("Исполнитель услуг уже есть: Никола Симич")

        print("\nГотово. Демо-пароль для всех аккаунтов:", DEMO_PASSWORD)
        print("Email-адреса: demo-ana / demo-marko / demo-jelena / demo-nikola / demo-milica @petsocial.example")

    finally:
        db.close()


if __name__ == "__main__":
    main()
