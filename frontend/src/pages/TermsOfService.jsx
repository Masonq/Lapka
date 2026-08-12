import { useTranslation } from "react-i18next";
import LegalPage from "../components/LegalPage";

export default function TermsOfService() {
  const { i18n } = useTranslation();
  const isSr = i18n.language === "sr";

  if (isSr) {
    return (
      <LegalPage title="Uslovi korišćenja" updatedLabel="Poslednja izmena: avgust 2026.">
        <p>
          <b>Napomena:</b> Ovo je radna verzija uslova korišćenja, sastavljena da odražava
          stvarne funkcije Lapki.info. Nije zamena za pravni savet — pre zvaničnog lansiranja
          preporučujemo proveru od strane advokata.
        </p>
        <h3>1. Ko može da koristi Lapki</h3>
        <p>Lapki.info je namenjen vlasnicima kućnih ljubimaca u Beogradu i okolini. Registracijom potvrđuješ da imaš najmanje 16 godina i da su podaci koje unosiš tačni.</p>
        <h3>2. Nalog</h3>
        <p>Odgovoran/na si za bezbednost svoje lozinke i sve radnje preduzete sa tvog naloga. Jedan nalog — jedna osoba; deljenje naloga nije dozvoljeno.</p>
        <h3>3. Sadržaj koji objavljuješ</h3>
        <p>Zadržavaš prava na fotografije, tekstove i druge sadržaje koje objaviš. Objavljivanjem dozvoljavaš Lapki.info da taj sadržaj prikazuje unutar platforme (feed, pretraga, deljenje linka). Ne objavljuj tuđe fotografije bez dozvole i ne objavljuj lažne informacije o izgubljenim/pronađenim ljubimcima.</p>
        <h3>4. Zabranjeno ponašanje</h3>
        <p>Zabranjeni su: uznemiravanje drugih korisnika, prevare (posebno u delu za oglase), zlostavljanje životinja ili njegovo promovisanje, trgovina zaštićenim/divljim vrstama, spam i lažni nalozi.</p>
        <h3>5. Moderacija i blokiranje</h3>
        <p>Administratori mogu da uklone sadržaj koji krši ova pravila i da blokiraju nalog, uz ili bez prethodnog upozorenja, u zavisnosti od ozbiljnosti kršenja. Blokada odmah onemogućava pristup nalogu.</p>
        <h3>6. Oglasi i transakcije</h3>
        <p>Lapki.info je samo prostor za povezivanje kupaca i prodavaca — platforma nije strana u transakciji, ne garantuje tačnost oglasa niti bezbednost razmene. Preporučujemo lične sastanke na javnim, bezbednim mestima.</p>
        <h3>7. Ograničenje odgovornosti</h3>
        <p>Servis se pruža "kakav jeste". Ne garantujemo tačnost informacija koje objavljuju korisnici (uključujući oglase o izgubljenim/pronađenim životinjama) i nismo odgovorni za štetu nastalu korišćenjem platforme, u meri u kojoj to zakon dozvoljava.</p>
        <h3>8. Brisanje naloga</h3>
        <p>Nalog možeš obrisati u bilo kom trenutku u Podešavanjima — brisanje je trajno i uklanja tvoje objave, komentare, poruke i druge podatke.</p>
        <h3>9. Izmene uslova</h3>
        <p>Ovi uslovi se mogu menjati. O značajnim izmenama ćemo obavestiti putem platforme.</p>
        <h3>10. Kontakt</h3>
        <p>Pitanja u vezi sa ovim uslovima možeš poslati timu Lapki.info putem podrške unutar aplikacije.</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Условия использования" updatedLabel="Последнее обновление: август 2026">
      <p>
        <b>Важная оговорка:</b> это рабочая версия условий использования, составленная так,
        чтобы честно отражать реальные функции Lapki.info. Она не заменяет юридическую
        консультацию — перед официальным запуском рекомендуем проверку у юриста.
      </p>
      <h3>1. Кто может пользоваться Lapki</h3>
      <p>Lapki.info предназначен для владельцев домашних животных в Белграде и окрестностях. Регистрируясь, ты подтверждаешь, что тебе не меньше 16 лет и что указанные данные достоверны.</p>
      <h3>2. Аккаунт</h3>
      <p>Ты отвечаешь за сохранность своего пароля и за все действия, совершённые через твой аккаунт. Один аккаунт — один человек; передавать доступ другим не разрешается.</p>
      <h3>3. Контент, который ты публикуешь</h3>
      <p>Права на фотографии, тексты и другой контент, который ты публикуешь, остаются за тобой. Публикуя его, ты разрешаешь Lapki.info показывать этот контент внутри платформы (лента, поиск, предпросмотр при расшаривании ссылки). Не публикуй чужие фотографии без разрешения и не размещай заведомо ложную информацию о потерянных/найденных животных.</p>
      <h3>4. Запрещённое поведение</h3>
      <p>Запрещены: домогательства к другим пользователям, мошенничество (особенно в разделе объявлений), жестокое обращение с животными или его пропаганда, торговля охраняемыми/дикими видами, спам и фальшивые аккаунты.</p>
      <h3>5. Модерация и блокировка</h3>
      <p>Администраторы могут удалять контент, нарушающий эти правила, и блокировать аккаунт — с предупреждением или без, в зависимости от тяжести нарушения. Блокировка лишает доступа к аккаунту немедленно.</p>
      <h3>6. Объявления и сделки</h3>
      <p>Lapki.info — только площадка для связи покупателей и продавцов. Платформа не является стороной сделки, не гарантирует точность объявлений и безопасность обмена. Рекомендуем личные встречи в людных, безопасных местах.</p>
      <h3>7. Ограничение ответственности</h3>
      <p>Сервис предоставляется «как есть». Мы не гарантируем достоверность информации, которую публикуют пользователи (включая объявления о потерянных/найденных животных), и не несём ответственности за ущерб от использования платформы — в пределах, допустимых законом.</p>
      <h3>8. Удаление аккаунта</h3>
      <p>Аккаунт можно удалить в любой момент в Настройках — удаление необратимо и убирает твои посты, комментарии, сообщения и другие данные.</p>
      <h3>9. Изменения условий</h3>
      <p>Эти условия могут меняться. О существенных изменениях мы сообщим через саму платформу.</p>
      <h3>10. Контакты</h3>
      <p>Вопросы по этим условиям можно направить команде Lapki.info через поддержку внутри приложения.</p>
    </LegalPage>
  );
}
