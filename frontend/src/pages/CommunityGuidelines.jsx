import { useTranslation } from "react-i18next";
import LegalPage from "../components/LegalPage";

export default function CommunityGuidelines() {
  const { i18n } = useTranslation();
  const isSr = i18n.language === "sr";

  if (isSr) {
    return (
      <LegalPage title="Pravila zajednice" updatedLabel="Poslednja izmena: avgust 2026.">
        <p>Lapki.info postoji da poveže vlasnike ljubimaca u Beogradu — da brzo pronađu izgubljenog psa, prodaju ono što više ne treba, ili jednostavno popričaju sa drugim ljubiteljima životinja. Ova pravila čuvaju taj prostor bezbednim i korisnim za sve.</p>
        <h3>Životinje na prvom mestu</h3>
        <p>Zabranjeno je bilo kakvo zlostavljanje životinja ili njegovo promovisanje, prikazivanje ili opravdavanje. Trgovina zaštićenim ili divljim vrstama nije dozvoljena. Ako sumnjaš da neka objava krši ovo pravilo — prijavi je, ne raspravljaj se u komentarima.</p>
        <h3>Tačnost pre svega u objavama o izgubljenim/pronađenim</h3>
        <p>Ovaj deo platforme drugi ljudi koriste u trenucima stresa. Ne objavljuj namerno lažne informacije, ne koristi tuđe fotografije kao svoje. Ako si pronašao/la svog ljubimca — označi objavu kao rešenu, da ne troši tuđe vreme.</p>
        <h3>Poštovanje u razgovoru</h3>
        <p>Bez uvreda, pretnji i uznemiravanja — ni u komentarima, ni u privatnim porukama. Neslaganje je u redu, napad na osobu nije.</p>
        <h3>Oglasi — pošteno i bezbedno</h3>
        <p>Opisuj stanje predmeta tačno. Za sastanke biraj javna, bezbedna mesta. Prijavi svaki pokušaj prevare.</p>
        <h3>Fotografije i sadržaj</h3>
        <p>Objavljuj samo svoje fotografije ili one za koje imaš dozvolu. Bez eksplicitnog, nasilnog ili uznemirujućeg sadržaja.</p>
        <h3>Bez spama</h3>
        <p>Bez masovne reklame, lažnih naloga i ponavljanja iste objave više puta.</p>
        <h3>Šta se dešava pri kršenju</h3>
        <p>U zavisnosti od ozbiljnosti: upozorenje, uklanjanje sadržaja, ili blokiranje naloga. Ozbiljna kršenja (zlostavljanje životinja, prevare, pretnje) mogu dovesti do trenutnog blokiranja bez upozorenja.</p>
        <p style={{ marginTop: 20 }}>Hvala što deo ove zajednice činiš boljim mestom za sve ljubimce u Beogradu. 🐾</p>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Правила сообщества" updatedLabel="Последнее обновление: август 2026">
      <p>Lapki.info существует, чтобы соединять владельцев животных в Белграде — быстро найти потерявшуюся собаку, продать то, что больше не нужно, или просто поговорить с другими любителями животных. Эти правила берегут это пространство безопасным и полезным для всех.</p>
      <h3>Животные — на первом месте</h3>
      <p>Запрещено любое жестокое обращение с животными, а также его пропаганда, демонстрация или оправдание. Торговля охраняемыми или дикими видами не разрешена. Если подозреваешь, что пост нарушает это правило — пожалуйся, не спорь в комментариях.</p>
      <h3>Точность прежде всего в постах о потерянных/найденных</h3>
      <p>Этой частью платформы другие люди пользуются в момент стресса. Не публикуй заведомо ложную информацию, не используй чужие фотографии как свои. Если нашёл своего питомца — отметь пост решённым, чтобы не отнимать чужое время.</p>
      <h3>Уважение в общении</h3>
      <p>Без оскорблений, угроз и травли — ни в комментариях, ни в личных сообщениях. Несогласие — это нормально, нападки на человека — нет.</p>
      <h3>Объявления — честно и безопасно</h3>
      <p>Описывай состояние вещи точно. Для встреч выбирай людные, безопасные места. Сообщай о любой попытке мошенничества.</p>
      <h3>Фотографии и контент</h3>
      <p>Публикуй только свои фотографии или те, на которые у тебя есть разрешение. Без откровенного, жестокого или пугающего контента.</p>
      <h3>Без спама</h3>
      <p>Без массовой рекламы, фальшивых аккаунтов и повторной публикации одного и того же поста много раз.</p>
      <h3>Что происходит при нарушении</h3>
      <p>В зависимости от тяжести: предупреждение, удаление контента, или блокировка аккаунта. Серьёзные нарушения (жестокое обращение с животными, мошенничество, угрозы) могут привести к немедленной блокировке без предупреждения.</p>
      <p style={{ marginTop: 20 }}>Спасибо, что делаешь это сообщество лучше для всех животных Белграда. 🐾</p>
    </LegalPage>
  );
}
