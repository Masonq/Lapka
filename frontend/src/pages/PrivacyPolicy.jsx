import { useTranslation } from "react-i18next";
import LegalPage from "../components/LegalPage";

export default function PrivacyPolicy() {
  const { i18n } = useTranslation();
  const isSr = i18n.language === "sr";

  if (isSr) {
    return (
      <LegalPage title="Politika privatnosti" updatedLabel="Poslednja izmena: avgust 2026.">
        <p>
          <b>Napomena:</b> radna verzija, sastavljena da tačno opisuje šta Lapki.info stvarno
          prikuplja — nije zamena za pravni savet.
        </p>
        <h3>1. Koje podatke prikupljamo</h3>
        <p>Pri registraciji: email ili Telegram nalog, ime, grad, lozinka (čuva se samo u heširanom obliku, nikad kao čist tekst). Dodatno, po tvom izboru: fotografija profila, podaci o ljubimcima (ime, vrsta, rasa, starost, opis), objave, fotografije uz objave i priče, poruke drugim korisnicima, lokacija koju uneseš tekstom (grad — ne tačne GPS koordinate, aplikacija ih ne traži). Za bezbednost: IP adresa se privremeno koristi za ograničavanje broja pokušaja (npr. prijave), ne čuva se trajno uz tvoj profil.</p>
        <h3>2. Kako koristimo podatke</h3>
        <p>Isključivo za rad servisa — prikaz feed-a, pretragu, slanje obaveštenja, sprečavanje zloupotrebe. Ne prodajemo podatke trećim licima i ne koristimo ih za oglašavanje van same platforme.</p>
        <h3>3. Deljenje sadržaja</h3>
        <p>Objave, oglasi, profili ljubimaca i javni profili korisnika su vidljivi drugim korisnicima (i, za deljene linkove, kratak pregled sa naslovom/slikom pri deljenju na Telegram/WhatsApp i sličnim aplikacijama). Poruke i podaci o zdravlju ljubimca su privatni — vidljivi samo tebi.</p>
        <h3>4. Kolačići i lokalno čuvanje</h3>
        <p>Za prijavu koristimo token sačuvan u localStorage tvog pretraživača (ne cookie) — ostaje samo na tvom uređaju.</p>
        <h3>5. Tvoja prava</h3>
        <p>Brisanje naloga (Podešavanja → Obriši nalog) trajno uklanja tvoje objave, komentare, ljubimce i poruke. Izvoz ličnih podataka trenutno nije dostupan kao samostalna funkcija — u pripremi je.</p>
        <h3>6. Čuvanje podataka</h3>
        <p>Podaci se čuvaju dok je nalog aktivan. Rezervne kopije baze podataka se čuvaju najviše 14 dana.</p>
        <h3>7. Izmene politike</h3>
        <p>O značajnim izmenama ćemo obavestiti putem same platforme.</p>
        <h3>8. Kontakt</h3>
        <p>Pitanja o privatnosti možeš poslati timu Lapki.info putem podrške unutar aplikacije.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Политика конфиденциальности" updatedLabel="Последнее обновление: август 2026">
      <p>
        <b>Важная оговорка:</b> рабочая версия, составленная так, чтобы точно описывать
        то, что Lapki.info реально собирает — не заменяет юридическую консультацию.
      </p>
      <h3>1. Какие данные мы собираем</h3>
      <p>При регистрации: email или Telegram-аккаунт, имя, город, пароль (хранится только в хешированном виде, никогда как открытый текст). Дополнительно, по твоему желанию: фото профиля, данные о питомцах (имя, вид, порода, возраст, описание), посты, фото к постам и историям, сообщения другим пользователям, местоположение, указанное текстом (город — не точные GPS-координаты, приложение их не запрашивает). Для безопасности: IP-адрес временно используется для ограничения количества попыток (например, входа в аккаунт), не хранится постоянно вместе с профилем.</p>
      <h3>2. Как мы используем данные</h3>
      <p>Исключительно для работы сервиса — показ ленты, поиск, отправка уведомлений, защита от злоупотреблений. Мы не продаём данные третьим лицам и не используем их для рекламы за пределами самой платформы.</p>
      <h3>3. Кому видны твои данные</h3>
      <p>Посты, объявления, профили питомцев и публичные профили пользователей видны другим пользователям (а для расшаренных ссылок — краткий предпросмотр с заголовком/фото при отправке в Telegram/WhatsApp и подобные). Сообщения и данные о здоровье питомца приватны — видны только тебе.</p>
      <h3>4. Cookies и локальное хранение</h3>
      <p>Для входа используется токен, сохранённый в localStorage твоего браузера (не cookie) — остаётся только на твоём устройстве.</p>
      <h3>5. Твои права</h3>
      <p>Удаление аккаунта (Настройки → Удалить аккаунт) необратимо убирает твои посты, комментарии, питомцев и сообщения. Экспорт личных данных пока не доступен как отдельная функция — в разработке.</p>
      <h3>6. Хранение данных</h3>
      <p>Данные хранятся, пока аккаунт активен. Резервные копии базы данных хранятся не дольше 14 дней.</p>
      <h3>7. Изменения политики</h3>
      <p>О существенных изменениях мы сообщим через саму платформу.</p>
      <h3>8. Контакты</h3>
      <p>Вопросы о конфиденциальности можно направить команде Lapki.info через поддержку внутри приложения.</p>
    </LegalPage>
  );
}
