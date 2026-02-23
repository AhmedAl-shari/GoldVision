/**
 * Yemen Locations Data
 * Complete list of all 22 governorates (muhafazat) and their districts
 * Used for shop location selection and map navigation
 */

export interface YemenDistrict {
  id: string;
  name: string;
  nameAr: string;
  coordinates: [number, number]; // [latitude, longitude]
}

export interface YemenGovernorate {
  id: string;
  name: string;
  nameAr: string;
  coordinates: [number, number]; // [latitude, longitude] - governorate center
  districts: YemenDistrict[];
}

/**
 * Complete list of all 22 Yemeni governorates with their districts
 */
export const YEMEN_GOVERNORATES: YemenGovernorate[] = [
  {
    id: "ADEN",
    name: "Aden",
    nameAr: "عدن",
    coordinates: [12.7855, 45.0187],
    districts: [
      { id: "AL_BURAIQA", name: "Al Buraiqa", nameAr: "البريقة", coordinates: [12.8, 45.0] },
      { id: "AL_MANSURA", name: "Al Mansura", nameAr: "المنصورة", coordinates: [12.8, 45.05] },
      { id: "MUALLA", name: "Mualla", nameAr: "المعلا", coordinates: [12.78, 45.02] },
      { id: "SHEIKH_OTHMAN", name: "Sheikh Othman", nameAr: "الشيخ عثمان", coordinates: [12.85, 45.0] },
      { id: "TAWAHI", name: "Tawahi", nameAr: "التواهي", coordinates: [12.77, 45.01] },
      { id: "CRATER", name: "Crater", nameAr: "كريتر", coordinates: [12.78, 45.03] },
      { id: "DAR_SAD", name: "Dar Sad", nameAr: "دار سعد", coordinates: [12.82, 45.02] },
      { id: "KHUR_MAKSAR", name: "Khur Maksar", nameAr: "خور مكسر", coordinates: [12.8, 45.01] },
    ],
  },
  {
    id: "SANAA",
    name: "Sana'a",
    nameAr: "صنعاء",
    coordinates: [15.3694, 44.191],
    districts: [
      { id: "OLD_CITY", name: "Old City", nameAr: "البلدة القديمة", coordinates: [15.35, 44.21] },
      { id: "HADDA", name: "Hadda", nameAr: "حدة", coordinates: [15.35, 44.2] },
      { id: "AL_SAFIN", name: "Al Safin", nameAr: "الصفين", coordinates: [15.38, 44.19] },
      { id: "AL_SAFINAH", name: "Al Safinah", nameAr: "الصفينة", coordinates: [15.37, 44.18] },
      { id: "AL_QUDS", name: "Al Quds", nameAr: "القدس", coordinates: [15.36, 44.2] },
      { id: "AL_MAHATTAT", name: "Al Mahattat", nameAr: "المحطات", coordinates: [15.34, 44.19] },
      { id: "AL_TAHRIR", name: "Al Tahrir", nameAr: "التحرير", coordinates: [15.35, 44.2] },
      { id: "AL_WAHDAH", name: "Al Wahdah", nameAr: "الوحدة", coordinates: [15.36, 44.19] },
      { id: "AS_SABEEN", name: "As Sabeen", nameAr: "السبعين", coordinates: [15.33, 44.18] },
      { id: "BANI_AL_HARITH", name: "Bani Al Harith", nameAr: "بني الحارث", coordinates: [15.4, 44.17] },
    ],
  },
  {
    id: "TAIZ",
    name: "Taiz",
    nameAr: "تعز",
    coordinates: [13.5779, 44.017],
    districts: [
      { id: "AL_MUDHAFFAR", name: "Al Mudhaffar", nameAr: "المظفر", coordinates: [13.58, 44.02] },
      { id: "AL_QAHIRAH", name: "Al Qahirah", nameAr: "القاهرة", coordinates: [13.57, 44.01] },
      { id: "SALAH", name: "Salah", nameAr: "صلاح", coordinates: [13.59, 44.02] },
      { id: "AL_MAQATIRAH", name: "Al Maqatirah", nameAr: "المقاطرة", coordinates: [13.56, 44.02] },
      { id: "ASH_SHAHID", name: "Ash Shahid", nameAr: "الشهيد", coordinates: [13.58, 44.01] },
    ],
  },
  {
    id: "HODEIDAH",
    name: "Hodeidah",
    nameAr: "الحديدة",
    coordinates: [14.7978, 42.9545],
    districts: [
      { id: "AL_HAWK", name: "Al Hawk", nameAr: "الحوك", coordinates: [14.8, 42.96] },
      { id: "AL_MINA", name: "Al Mina", nameAr: "الميناء", coordinates: [14.79, 42.95] },
      { id: "AZ_ZAIDIYAH", name: "Az Zaydiyah", nameAr: "الزيدية", coordinates: [14.81, 42.95] },
      { id: "BAJIL", name: "Bajil", nameAr: "باجل", coordinates: [15.05, 43.17] },
      { id: "ZABID", name: "Zabid", nameAr: "زبيد", coordinates: [14.2, 43.32] },
    ],
  },
  {
    id: "IBB",
    name: "Ibb",
    nameAr: "إب",
    coordinates: [13.9667, 44.1667],
    districts: [
      { id: "IBB_CITY", name: "Ibb City", nameAr: "مدينة إب", coordinates: [13.97, 44.17] },
      { id: "AL_UDHAIN", name: "Al Udhain", nameAr: "العدين", coordinates: [14.0, 44.2] },
      { id: "BAADAN", name: "Baadan", nameAr: "بعدان", coordinates: [13.95, 44.15] },
      { id: "FAR_AL_UDHAIN", name: "Far Al Udhain", nameAr: "فرع العدين", coordinates: [13.98, 44.18] },
      { id: "HAZM_AL_UDHAIN", name: "Hazm Al Udhain", nameAr: "حزم العدين", coordinates: [13.99, 44.19] },
    ],
  },
  {
    id: "DHAMAR",
    name: "Dhamar",
    nameAr: "ذمار",
    coordinates: [14.5457, 44.4051],
    districts: [
      { id: "DHAMAR_CITY", name: "Dhamar City", nameAr: "مدينة ذمار", coordinates: [14.55, 44.41] },
      { id: "ANS", name: "Ans", nameAr: "أنس", coordinates: [14.56, 44.42] },
      { id: "JAHARAN", name: "Jaharan", nameAr: "جهران", coordinates: [14.54, 44.4] },
      { id: "MAYBAR", name: "Maybar", nameAr: "مأرب", coordinates: [14.53, 44.39] },
    ],
  },
  {
    id: "HADRAMOUT",
    name: "Hadramout",
    nameAr: "حضرموت",
    coordinates: [15.35, 48.5167],
    districts: [
      { id: "AL_MUKALLA", name: "Al Mukalla", nameAr: "المكلا", coordinates: [14.54, 49.13] },
      { id: "SHIBAM", name: "Shibam", nameAr: "شبام", coordinates: [15.51, 48.63] },
      { id: "SEIYUN", name: "Seiyun", nameAr: "سيئون", coordinates: [15.95, 48.79] },
      { id: "TARIM", name: "Tarim", nameAr: "تريم", coordinates: [16.05, 48.99] },
    ],
  },
  {
    id: "HAJJAH",
    name: "Hajjah",
    nameAr: "حجة",
    coordinates: [15.6947, 43.6025],
    districts: [
      { id: "HAJJAH_CITY", name: "Hajjah City", nameAr: "مدينة حجة", coordinates: [15.7, 43.6] },
      { id: "ABSS", name: "Abs", nameAr: "عبس", coordinates: [16.0, 43.2] },
      { id: "BAKIL_AL_MIR", name: "Bakil Al Mir", nameAr: "بكيل المير", coordinates: [15.8, 43.5] },
      { id: "HARADH", name: "Haradh", nameAr: "حرض", coordinates: [16.4, 43.1] },
    ],
  },
  {
    id: "AL_MAHWIT",
    name: "Al Mahwit",
    nameAr: "المحويت",
    coordinates: [15.47, 43.55],
    districts: [
      { id: "AL_MAHWIT_CITY", name: "Al Mahwit City", nameAr: "مدينة المحويت", coordinates: [15.47, 43.55] },
      { id: "AL_KHABT", name: "Al Khabt", nameAr: "الخبت", coordinates: [15.45, 43.53] },
      { id: "AT_TAWILAH", name: "At Tawilah", nameAr: "الطويلة", coordinates: [15.48, 43.57] },
    ],
  },
  {
    id: "AMRAN",
    name: "Amran",
    nameAr: "عمران",
    coordinates: [15.6594, 43.9439],
    districts: [
      { id: "AMRAN_CITY", name: "Amran City", nameAr: "مدينة عمران", coordinates: [15.66, 43.94] },
      { id: "HARF_SUFYAN", name: "Harf Sufyan", nameAr: "حرف سفيان", coordinates: [15.7, 43.9] },
      { id: "KHAWLAN", name: "Khawlan", nameAr: "خولان", coordinates: [15.65, 43.95] },
    ],
  },
  {
    id: "AL_BAYDA",
    name: "Al Bayda",
    nameAr: "البيضاء",
    coordinates: [13.9859, 45.5747],
    districts: [
      { id: "AL_BAYDA_CITY", name: "Al Bayda City", nameAr: "مدينة البيضاء", coordinates: [13.99, 45.57] },
      { id: "RADA", name: "Rada", nameAr: "رداع", coordinates: [14.43, 44.84] },
      { id: "MUKAYRAS", name: "Mukayras", nameAr: "مكيراس", coordinates: [13.95, 45.58] },
    ],
  },
  {
    id: "AL_JAWF",
    name: "Al Jawf",
    nameAr: "الجوف",
    coordinates: [16.7833, 44.7833],
    districts: [
      { id: "AL_HAZM", name: "Al Hazm", nameAr: "الحزم", coordinates: [16.78, 44.78] },
      { id: "AL_MATAMMAH", name: "Al Matammah", nameAr: "المطمة", coordinates: [16.8, 44.8] },
      { id: "BARAT_AL_ANAN", name: "Barat Al Anan", nameAr: "برط العنان", coordinates: [16.75, 44.75] },
    ],
  },
  {
    id: "AL_MAHRAH",
    name: "Al Mahrah",
    nameAr: "المهرة",
    coordinates: [16.7333, 52.8333],
    districts: [
      { id: "AL_GHAYDAH", name: "Al Ghaydah", nameAr: "الغيضة", coordinates: [16.73, 52.83] },
      { id: "SAYHUT", name: "Sayhut", nameAr: "سيحوت", coordinates: [15.21, 51.24] },
      { id: "QISHN", name: "Qishn", nameAr: "قشن", coordinates: [15.42, 51.68] },
    ],
  },
  {
    id: "DHALE",
    name: "Ad Dali",
    nameAr: "الضالع",
    coordinates: [13.6947, 44.7314],
    districts: [
      { id: "AD_DHALE", name: "Ad Dhale", nameAr: "الضالع", coordinates: [13.69, 44.73] },
      { id: "DAMT", name: "Damt", nameAr: "دمت", coordinates: [13.95, 44.78] },
      { id: "QAATABAH", name: "Qa'atabah", nameAr: "قعطبة", coordinates: [13.85, 44.7] },
    ],
  },
  {
    id: "LAHJ",
    name: "Lahij",
    nameAr: "لحج",
    coordinates: [13.0567, 44.8819],
    districts: [
      { id: "LAHJ_CITY", name: "Lahij City", nameAr: "مدينة لحج", coordinates: [13.06, 44.88] },
      { id: "AL_HABILAYN", name: "Al Habilayn", nameAr: "الحبيلين", coordinates: [13.05, 44.87] },
      { id: "RADFAN", name: "Radfan", nameAr: "ردفان", coordinates: [13.07, 44.89] },
    ],
  },
  {
    id: "MARIB",
    name: "Marib",
    nameAr: "مأرب",
    coordinates: [15.45, 45.33],
    districts: [
      { id: "MARIB_CITY", name: "Marib City", nameAr: "مدينة مأرب", coordinates: [15.45, 45.33] },
      { id: "AL_ABIDIYAH", name: "Al Abidiyah", nameAr: "العبيدية", coordinates: [15.5, 45.35] },
      { id: "HARIB", name: "Harib", nameAr: "حريب", coordinates: [15.4, 45.3] },
    ],
  },
  {
    id: "RAYMAH",
    name: "Raymah",
    nameAr: "الريمة",
    coordinates: [14.6333, 43.7],
    districts: [
      { id: "AL_JABIN", name: "Al Jabin", nameAr: "الجبن", coordinates: [14.63, 43.7] },
      { id: "AL_MAZAR", name: "Al Mazar", nameAr: "المزار", coordinates: [14.65, 43.72] },
      { id: "KUSMA", name: "Kusma", nameAr: "كسمة", coordinates: [14.6, 43.68] },
    ],
  },
  {
    id: "SAADA",
    name: "Saada",
    nameAr: "صعدة",
    coordinates: [16.95, 43.75],
    districts: [
      { id: "SAADA_CITY", name: "Saada City", nameAr: "مدينة صعدة", coordinates: [16.95, 43.75] },
      { id: "AL_HAFASH", name: "Al Hafash", nameAr: "الحفاش", coordinates: [16.97, 43.77] },
      { id: "BAQIM", name: "Baqim", nameAr: "بقم", coordinates: [17.0, 43.7] },
    ],
  },
  {
    id: "SHABWAH",
    name: "Shabwah",
    nameAr: "شبوة",
    coordinates: [14.55, 46.83],
    districts: [
      { id: "ATTAQ", name: "Attaq", nameAr: "عتق", coordinates: [14.55, 46.83] },
      { id: "BAYHAN", name: "Bayhan", nameAr: "بيحان", coordinates: [14.8, 45.73] },
      { id: "HABABAN", name: "Hababan", nameAr: "حبابان", coordinates: [14.5, 46.8] },
    ],
  },
  {
    id: "SOCOTRA",
    name: "Socotra",
    nameAr: "سقطرى",
    coordinates: [12.5, 54.0],
    districts: [
      { id: "HADIBOH", name: "Hadiboh", nameAr: "حديبو", coordinates: [12.65, 54.02] },
      { id: "QALANSYAH", name: "Qalansyah", nameAr: "قلنسية", coordinates: [12.69, 53.49] },
    ],
  },
  {
    id: "ABYAN",
    name: "Abyan",
    nameAr: "أبين",
    coordinates: [13.65, 45.05],
    districts: [
      { id: "ZINJIBAR", name: "Zinjibar", nameAr: "زنجبار", coordinates: [13.13, 45.38] },
      { id: "LAWDAR", name: "Lawdar", nameAr: "لودر", coordinates: [13.88, 45.87] },
      { id: "KHANFIR", name: "Khanfir", nameAr: "خنفر", coordinates: [13.42, 45.68] },
    ],
  },
];

/**
 * Get governorate by ID
 */
export function getGovernorateById(id: string): YemenGovernorate | undefined {
  return YEMEN_GOVERNORATES.find((gov) => gov.id === id);
}

/**
 * Get district by governorate and district IDs
 */
export function getDistrictById(
  governorateId: string,
  districtId: string
): YemenDistrict | undefined {
  const governorate = getGovernorateById(governorateId);
  return governorate?.districts.find((dist) => dist.id === districtId);
}

/**
 * Get all governorate names (for dropdowns)
 */
export function getGovernorateNames(locale: "en" | "ar" = "en"): Array<{ id: string; name: string }> {
  return YEMEN_GOVERNORATES.map((gov) => ({
    id: gov.id,
    name: locale === "ar" ? gov.nameAr : gov.name,
  }));
}

/**
 * Get districts for a governorate
 */
export function getDistrictsByGovernorate(
  governorateId: string,
  locale: "en" | "ar" = "en"
): Array<{ id: string; name: string }> {
  const governorate = getGovernorateById(governorateId);
  if (!governorate) return [];
  return governorate.districts.map((dist) => ({
    id: dist.id,
    name: locale === "ar" ? dist.nameAr : dist.name,
  }));
}

/**
 * Get coordinates for a location (governorate or district)
 */
export function getLocationCoordinates(
  governorateId: string,
  districtId?: string
): [number, number] {
  if (districtId) {
    const district = getDistrictById(governorateId, districtId);
    if (district) return district.coordinates;
  }
  const governorate = getGovernorateById(governorateId);
  return governorate?.coordinates || [15.3694, 44.191]; // Default to Sana'a
}

