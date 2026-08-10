/**
 * Перевод ОТОБРАЖЕНИЯ фиксированных значений данных (вид животного, пол,
 * уровень активности, город из списка в "Рядом") — без изменения самого
 * значения, которое хранится в БД и используется для сравнения/фильтрации.
 *
 * Например: pet.species === "Собака" остаётся сравнением с русской строкой
 * (так хранится в базе для всех уже созданных питомцев), но пользователь с
 * сербским интерфейсом видит "Pas", а не "Собака". Если значение не входит
 * в известный список (например, город — свободный текст) — просто
 * возвращается как есть, без перевода.
 *
 * Каждая translateX(t, value) принимает t из useTranslation() вызывающего
 * компонента — так перевод остаётся реактивным (обновляется при
 * переключении языка), в отличие от прямого вызова i18n.t() в обход хука.
 */

const SPECIES_KEYS = {
  "Собака": "data_labels.species_dog",
  "Кошка": "data_labels.species_cat",
  "Другое": "data_labels.species_other",
};

const GENDER_KEYS = {
  "Мальчик": "data_labels.gender_male",
  "Девочка": "data_labels.gender_female",
};

const ACTIVITY_KEYS = {
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
