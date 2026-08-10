/**
 * Популярные породы — используются в BreedPicker.jsx для поиска при
 * добавлении питомца. В отличие от species/gender/activity_level (после
 * миграции a3f7c9e14b52) — это НЕ обязательный список: если нужной породы
 * нет, пользователь всегда может ввести любой свободный текст (мешанец,
 * местное название и т.д.) — value в этом случае просто произвольная
 * строка, как раньше.
 *
 * value — то, что реально сохраняется в pet.breed при выборе из списка
 * (нейтральный ключ, не русский текст) — тот же принцип, что уже
 * применён к species/gender/activity_level. labelKey — ключ перевода.
 */

export const DOG_BREEDS = [
  { value: "mixed_dog", labelKey: "breeds.mixed" },
  { value: "labrador", labelKey: "breeds.labrador" },
  { value: "german_shepherd", labelKey: "breeds.german_shepherd" },
  { value: "golden_retriever", labelKey: "breeds.golden_retriever" },
  { value: "yorkshire_terrier", labelKey: "breeds.yorkshire_terrier" },
  { value: "chihuahua", labelKey: "breeds.chihuahua" },
  { value: "husky", labelKey: "breeds.husky" },
  { value: "dachshund", labelKey: "breeds.dachshund" },
  { value: "pug", labelKey: "breeds.pug" },
  { value: "beagle", labelKey: "breeds.beagle" },
  { value: "french_bulldog", labelKey: "breeds.french_bulldog" },
  { value: "rottweiler", labelKey: "breeds.rottweiler" },
  { value: "border_collie", labelKey: "breeds.border_collie" },
  { value: "poodle", labelKey: "breeds.poodle" },
  { value: "dalmatian", labelKey: "breeds.dalmatian" },
  // Шарпланинац — балканская пастушья порода, родом с гор на границе Сербии,
  // Косова и Северной Македонии — уместно включить отдельно от общего списка
  { value: "sarplaninac", labelKey: "breeds.sarplaninac" },
];

export const CAT_BREEDS = [
  { value: "mixed_cat", labelKey: "breeds.mixed_cat" },
  { value: "british_shorthair", labelKey: "breeds.british_shorthair" },
  { value: "maine_coon", labelKey: "breeds.maine_coon" },
  { value: "siamese", labelKey: "breeds.siamese" },
  { value: "persian", labelKey: "breeds.persian" },
  { value: "scottish_fold", labelKey: "breeds.scottish_fold" },
  { value: "sphynx", labelKey: "breeds.sphynx" },
  { value: "bengal", labelKey: "breeds.bengal" },
  { value: "abyssinian", labelKey: "breeds.abyssinian" },
];

export const BREED_LISTS = {
  dog: DOG_BREEDS,
  cat: CAT_BREEDS,
};

// Общий словарь value → labelKey из обоих списков разом — удобно для
// перевода ОТОБРАЖЕНИЯ уже сохранённого значения, не зная заранее вид
// животного (например, при показе профиля питомца)
const ALL_BREED_KEYS = Object.fromEntries(
  [...DOG_BREEDS, ...CAT_BREEDS].map((b) => [b.value, b.labelKey])
);

export function translateBreed(t, value) {
  return ALL_BREED_KEYS[value] ? t(ALL_BREED_KEYS[value]) : value;
}
