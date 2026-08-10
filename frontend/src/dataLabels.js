/**
 * Перевод ОТОБРАЖЕНИЯ фиксированных значений данных (вид животного, пол,
 * уровень активности, город из списка в "Рядом") — без изменения самого
 * значения, которое хранится в БД и используется для сравнения/фильтрации.
 *
 * С миграции a3f7c9e14b52 species/gender/activity_level в БД хранятся как
 * языконезависимые значения (dog/cat/other, male/female, calm/medium/active),
 * не русский текст напрямую — так сравнения в коде (pet.species === "dog")
 * корректны на любом языке интерфейса. Старые русские ключи (Собака/Мальчик/
 * Спокойный и т.д.) оставлены в словарях ниже намеренно — deploy/update.sh
 * сначала собирает и выкладывает фронтенд, потом накатывает миграцию backend,
 * то есть есть короткое окно, где новый фронтенд может встретить ещё не
 * сконвертированные записи. Оба формата ведут к одному и тому же переводу.
 *
 * Город — свободный текст (не входит в известный список) — просто
 * возвращается как есть, без перевода.
 *
 * Каждая translateX(t, value) принимает t из useTranslation() вызывающего
 * компонента — так перевод остаётся реактивным (обновляется при
 * переключении языка), в отличие от прямого вызова i18n.t() в обход хука.
 */

const SPECIES_KEYS = {
  dog: "data_labels.species_dog",
  cat: "data_labels.species_cat",
  other: "data_labels.species_other",
  "Собака": "data_labels.species_dog",
  "Кошка": "data_labels.species_cat",
  "Другое": "data_labels.species_other",
};

const GENDER_KEYS = {
  male: "data_labels.gender_male",
  female: "data_labels.gender_female",
  "Мальчик": "data_labels.gender_male",
  "Девочка": "data_labels.gender_female",
};

const ACTIVITY_KEYS = {
  calm: "data_labels.activity_calm",
  medium: "data_labels.activity_medium",
  active: "data_labels.activity_active",
  "Спокойный": "data_labels.activity_calm",
  "Средний": "data_labels.activity_medium",
  "Активный": "data_labels.activity_active",
};

const CITY_KEYS = {
  "Белград": "data_labels.city_belgrade",
  "Нови-Сад": "data_labels.city_novi_sad",
  "Ниш": "data_labels.city_nis",
};

export function translateSpecies(t, value) {
  return SPECIES_KEYS[value] ? t(SPECIES_KEYS[value]) : value;
}

export function translateGender(t, value) {
  return GENDER_KEYS[value] ? t(GENDER_KEYS[value]) : value;
}

export function translateActivity(t, value) {
  return ACTIVITY_KEYS[value] ? t(ACTIVITY_KEYS[value]) : value;
}

export function translateCity(t, value) {
  return CITY_KEYS[value] ? t(CITY_KEYS[value]) : value;
}
