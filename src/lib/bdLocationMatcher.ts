import { PathaoConfig, getPathaoCities, getPathaoZones, getPathaoAreas } from './pathaoApi';

export interface ResolvedLocation {
  cityId?: number;
  cityName?: string;
  zoneId?: number;
  zoneName?: string;
  areaId?: number;
  areaName?: string;
  district?: string;
  thana?: string;
  rawAddress: string;
  formattedSteadfastAddress: string;
  confidence: number;
}

export interface DistrictInfo {
  en: string;
  bn: string;
  aliases: string[];
  thanas?: Array<{
    en: string;
    bn: string;
    aliases?: string[];
    areas?: string[];
  }>;
}

// 64 Districts database with explicit Thana and Area hierarchy
export const BD_DISTRICTS: Record<string, DistrictInfo> = {
  dhaka: {
    en: 'Dhaka',
    bn: 'ঢাকা',
    aliases: ['dhaka', 'dhaka city', 'ঢাকা', 'ঢাকা সিটি', 'dhaka sadar'],
    thanas: [
      { en: 'Mirpur', bn: 'মিরপুর', aliases: ['mirpur', 'মিরপুর', 'পল্লবী', 'pallabi', 'মিরপুর ১০', 'মিরপুর ১', 'মিরপুর ২', 'মিরপুর ১১', 'মিরপুর ১২', 'মিরপুর ১৪', 'কালশী', 'শেওড়াপাড়া', 'কাজীপাড়া'], areas: ['Section 1', 'Section 2', 'Section 6', 'Section 10', 'Section 11', 'Section 12', 'Pallabi', 'Shewrapara', 'Kazipara'] },
      { en: 'Uttara', bn: 'উত্তরা', aliases: ['uttara', 'উত্তরা', 'তুরাগ', 'turag', 'আব্দুল্লাহপুর', 'আজমপুর', 'হাজী ক্যাম্প', 'বিমানবন্দর'], areas: ['Sector 1', 'Sector 3', 'Sector 4', 'Sector 7', 'Sector 9', 'Sector 10', 'Sector 11', 'Sector 12', 'Sector 13', 'Sector 14', 'Abdullahpur', 'Azampur'] },
      { en: 'Dhanmondi', bn: 'ধানমন্ডি', aliases: ['dhanmondi', 'ধানমন্ডি', 'ধানমণ্ডি', 'জিগাতলা', 'ঝিগাতলা', 'সোবহানবাগ', 'শংকর', 'রায়েরবাজার'], areas: ['Dhanmondi 27', 'Dhanmondi 32', 'Jigatola', 'Rayerbazar', 'Sobhanbagh'] },
      { en: 'Gulshan', bn: 'গুলশান', aliases: ['gulshan', 'গুলশান', 'বনানী', 'banani', 'নিক নিকেতন', 'বারিধারা', 'baridhara'], areas: ['Gulshan 1', 'Gulshan 2', 'Banani', 'Baridhara', 'Niketon'] },
      { en: 'Badda', bn: 'বাড্ডা', aliases: ['badda', 'বাড্ডা', 'মধ্য বাড্ডা', 'উত্তর বাড্ডা', 'দক্ষিণ বাড্ডা', 'মেরুল বাড্ডা', 'আফতাবনগর', 'aftabnagar'], areas: ['North Badda', 'South Badda', 'Middle Badda', 'Merul Badda', 'Aftabnagar'] },
      { en: 'Mohammadpur', bn: 'মোহাম্মদপুর', aliases: ['mohammadpur', 'মোহাম্মদপুর', 'বসিলা', 'বসিলা ব্রিজ', 'আদাবর', 'adabor', 'জাপান গার্ডেন সিটি', 'শ্যামলী', 'shyamoli'], areas: ['Town Hall', 'Bosila', 'Adabor', 'Shyamoli', 'Japan Garden City'] },
      { en: 'Jatrabari', bn: 'যাত্রাবাড়ী', aliases: ['jatrabari', 'যাত্রাবাড়ী', 'যাত্রাবাড়ি', 'ধোলাইপাড়', 'শনির আখড়া', 'কাজলা', 'রায়েরবাগ'], areas: ['Donia', 'Shonir Akhra', 'Rayerbagh', 'Kazla'] },
      { en: 'Motijheel', bn: 'মতিঝিল', aliases: ['motijheel', 'মতিঝিল', 'দিলকুশা', 'পল্টন', 'নয়া পল্টন', 'গুলিস্তান', 'ফকিরাপুল'], areas: ['Dilkusha', 'Paltan', 'Fulbaria', 'Fakirapool'] },
      { en: 'Savar', bn: 'সাভার', aliases: ['savar', 'সাভার', 'সাভার বাজার', 'হেমায়েতপুর', 'hemayetpur', 'নবীনগর', 'জাহাঙ্গীরনগর'], areas: ['Savar Bazar', 'Hemayetpur', 'Nabinagar', 'Bank Colony'] },
      { en: 'Ashulia', bn: 'আশুলিয়া', aliases: ['ashulia', 'আশুলিয়া', 'আশুলিয়া', 'জিরাবো', 'জামগড়া', 'বাইপাইল', 'ইপিজেড', 'epz'], areas: ['Baipail', 'Zirabo', 'Jamgora', 'DEPZ'] },
      { en: 'Keraniganj', bn: 'কেরানীগঞ্জ', aliases: ['keraniganj', 'কেরানীগঞ্জ', 'কেরানিগঞ্জ', 'কদমতলী', 'হাসনাবাদ', 'জিনজিরা', 'আঁটিবাজার'], areas: ['Zinzira', 'Kadamtoli', 'Atibazar', 'Hasnabad'] }
    ]
  },
  barisal: {
    en: 'Barisal',
    bn: 'বরিশাল',
    aliases: ['barisal', 'barishal', 'বরিশাল', 'বরিশাল সদর'],
    thanas: [
      {
        en: 'Agailzhara',
        bn: 'আগৈলঝাড়া',
        aliases: ['agailzhara', 'আগৈলঝাড়া', 'আগৈলঝাড়া', 'আগৈলঝাড়া থানা', 'আগৈলঝাড়া থানা'],
        areas: ['Bagda', 'বাগধা', 'বাগধা বাজার', 'Askor', 'আস্কর', 'Bahadurpur', 'বাহাদুরপুর', 'Bakal', 'বাকাল', 'Baropaika', 'বারোপাইকা', 'Basail', 'বাসাইল', 'Batra', 'বাতরা', 'Goila', 'গৈলা', 'Poisarhat', 'পয়সারহাট', 'Jobarpar', 'জোবারপাড়', 'Rajihar', 'রাজীহার', 'Saheber Hat', 'সাহেবের হাট', 'Saral', 'সরল', 'Shujonkathi', 'সুজনকাঠী']
      },
      { en: 'Gournadi', bn: 'গৌরনদী', aliases: ['gournadi', 'গৌরনদী', 'গৌরনদি', 'টরকী', 'torki'], areas: ['Torki', 'Bhurghata', 'Palordi', 'Barthi'] },
      { en: 'Babuganj', bn: 'বাবুগঞ্জ', aliases: ['babuganj', 'বাবুগঞ্জ', 'রহমতপুর', 'রহমতপুর বিমানবন্দর'], areas: ['Rahmatpur', 'Mirgonj', 'Dehergoti', 'Madhabpasha'] },
      { en: 'Bakerganj', bn: 'বাকেরগঞ্জ', aliases: ['bakerganj', 'বাকেরগঞ্জ', 'বোয়ালিয়া'], areas: ['Boalia', ' ভরপাশা', 'কলসকাঠি'] },
      { en: 'Banaripara', bn: 'বানারীপাড়া', aliases: ['banaripara', 'বানারীপাড়া', 'বানারিপাড়া', 'চাখার'], areas: ['Chakhar', 'Gava', 'Salimpur'] },
      { en: 'Hizla', bn: 'হিজলা', aliases: ['hizla', 'হিজলা', 'হরিনাথপুর'], areas: ['Harinathpur', 'Dhulkhola'] },
      { en: 'Mehendiganj', bn: 'মেহেন্দীগঞ্জ', aliases: ['mehendiganj', 'মেহেন্দীগঞ্জ', 'মেহেন্দিগঞ্জ', 'পাতারহাট', 'patarhat'], areas: ['Patarhat', 'Ulania', 'Gobindapur'] },
      { en: 'Muladi', bn: 'মুলাদী', aliases: ['muladi', 'মুলাদী', 'মুলাদি', 'কাজিরচর'], areas: ['Kazirchar', 'Batamara', 'Ghashimpur'] },
      { en: 'Wazirpur', bn: 'উজিরপুর', aliases: ['wazirpur', 'উজিরপুর', 'ধামুরা', 'শিকারপুর'], areas: ['Dhamura', 'Shikarpur', 'Guthia'] },
      { en: 'Barisal Sadar', bn: 'বরিশাল সদর', aliases: ['barisal sadar', 'সদর', 'কোতোয়ালী', 'kotwali', 'নথুল্লাবাদ', 'রূপাতলী', 'চৌমাথা', 'সদর রোড', 'বান্দ রোড', 'আলেকান্দা'], areas: ['Nathullabad', 'Rupatali', 'Choumatha', 'Sadar Road', 'Alekanda', 'Band Road'] }
    ]
  },
  gazipur: {
    en: 'Gazipur',
    bn: 'গাজীপুর',
    aliases: ['gazipur', 'গাজীপুর'],
    thanas: [
      { en: 'Tongi', bn: 'টঙ্গী', aliases: ['tongi', 'টঙ্গী', 'টংগী', 'চেরাগআলী', 'স্টেশন রোড', 'কলেজ গেট'], areas: ['Cherag Ali', 'Station Road', 'College Gate', 'Gazipura'] },
      { en: 'Gazipur Sadar', bn: 'গাজীপুর সদর', aliases: ['joydebpur', 'জয়দেবপুর', 'চৌরাস্তা', 'গাজীপুর চৌরাস্তা', 'শিববাড়ি'], areas: ['Chowrasta', 'Joydebpur', 'Shibbari', 'Chondona'] },
      { en: 'Kaliakair', bn: 'কালিয়াকৈর', aliases: ['kaliakair', 'কালিয়াকৈর', 'চন্দ্রা', 'chandra', 'মৌচাক'], areas: ['Chandra', 'Mouchak', 'Shafipur'] },
      { en: 'Sreepur', bn: 'শ্রীপুর', aliases: ['sreepur', 'শ্রীপুর', 'মাওনা', 'maona'], areas: ['Maona', 'Tekerhat', 'Kowraid'] },
      { en: 'Kapasia', bn: 'কাপাসিয়া', aliases: ['kapasia', 'কাপাসিয়া', 'রায়েদ'], areas: ['Rayed', 'Chandpur'] }
    ]
  },
  narayanganj: {
    en: 'Narayanganj',
    bn: 'নারায়ণগঞ্জ',
    aliases: ['narayanganj', 'narayangonj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ'],
    thanas: [
      { en: 'Narayanganj Sadar', bn: 'নারায়ণগঞ্জ সদর', aliases: ['chasara', 'চাষাড়া', 'ফতুল্লা', 'fatullah', 'সিদ্ধিরগঞ্জ', 'siddhirganj', 'শিমরাইল', 'চিটাগাং রোড'], areas: ['Chashara', 'Fatullah', 'Siddhirganj', 'Signboard', 'Chittagong Road'] },
      { en: 'Rupganj', bn: 'রূপগঞ্জ', aliases: ['rupganj', 'রূপগঞ্জ', 'ভুলতা', 'bhulta', 'গাউছিয়া', 'কাঞ্চন'], areas: ['Bhulta', 'Gawsia', 'Kanchan'] },
      { en: 'Araihazar', bn: 'আড়াইহাজার', aliases: ['araihazar', 'আড়াইহাজার', 'গোপালদী'], areas: ['Gopaldi', 'Uchitpur'] },
      { en: 'Sonargaon', bn: 'সোনারগাঁও', aliases: ['sonargaon', 'সোনারগাঁও', 'মোগরাপাড়া', 'কাঁচপুর', 'kachpur'], areas: ['Mograpara', 'Kachpur', 'Panam Nagar'] }
    ]
  },
  chittagong: {
    en: 'Chittagong',
    bn: 'চট্টগ্রাম',
    aliases: ['chittagong', 'chattogram', 'চট্টগ্রাম', 'চিটাগাং'],
    thanas: [
      { en: 'Kotwali', bn: 'কোতোয়ালী', aliases: ['kotwali', 'কোতোয়ালী', 'আন্দরকিল্লা', 'নিউ মার্কেট', 'জিইসি', 'gec', 'চকবাজার', 'chawkbazar'], areas: ['GEC', 'Andarkilla', 'Chawkbazar', 'New Market'] },
      { en: 'Agrabad', bn: 'আগ্রাবাদ', aliases: ['agrabad', 'আগ্রাবাদ', 'হালিশহর', 'halishahar', 'পতেঙ্গা', 'patenga', 'বারিক বিল্ডিং'], areas: ['Commercial Area', 'Halishahar', 'Patenga', 'Barik Building'] },
      { en: 'Hathazari', bn: 'হাটহাজারী', aliases: ['hathazari', 'হাটহাজারী', 'বিশ্ববিদ্যালয়', 'ফতেহপুর'], areas: ['Chittagong University', 'Fatehpur', 'Nazirhat'] },
      { en: 'Sitakunda', bn: 'সীতাকুণ্ড', aliases: ['sitakunda', 'সীতাকুণ্ড', 'কুমিরা', 'ভাটিয়ারী', 'bhatiary'], areas: ['Bhatiary', 'Kumira', 'Barabkunda'] },
      { en: 'Patiya', bn: 'পটিয়া', aliases: ['patiya', 'পটিয়া', 'মনসা'], areas: ['Monosa', 'Kachuai'] }
    ]
  },
  bogra: {
    en: 'Bogra',
    bn: 'বগুড়া',
    aliases: ['bogra', 'bogura', 'বগুড়া', 'বগুড়া'],
    thanas: [
      { en: 'Bogra Sadar', bn: 'বগুড়া সদর', aliases: ['bogra sadar', 'সাতমাথা', 'বনানী', 'চারমাথা', 'মাটিডালী'], areas: ['Satmatha', 'Charmatha', 'Matidali', 'Jhawtola'] },
      { en: 'Sherpur', bn: 'শেরপুর', aliases: ['sherpur', 'শেরপুর', 'ভবানীপুর'], areas: ['Bhabanipur', 'Mirzapur', 'Raninagar'] },
      { en: 'Shibganj', bn: 'শিবগঞ্জ', aliases: ['shibganj', 'শিবগঞ্জ', 'মহাস্থানগড়', 'মহাস্থান'], areas: ['Mahasthangarh', 'Mokamtola'] },
      { en: 'Dupchanchia', bn: 'দুপচাঁচিয়া', aliases: ['dupchanchia', 'দুপচাঁচিয়া', 'দুপচাচিয়া', 'তালোড়া'], areas: ['Talora', 'Goonahar'] },
      { en: 'Gabtali', bn: 'গাবতলী', aliases: ['gabtali', 'গাবতলী', 'কাগজীপাড়া'], areas: ['Kagzipara', 'Nasirpur'] }
    ]
  },
  sylhet: {
    en: 'Sylhet',
    bn: 'সিলেট',
    aliases: ['sylhet', 'সিলেট'],
    thanas: [
      { en: 'Sylhet Sadar', bn: 'সিলেট সদর', aliases: ['sylhet sadar', 'জিন্দাবাজার', 'আম্বরখানা', 'উপশহর', 'চৌহাট্টা', 'টিলাগড়', 'মেডিকেল রোড'], areas: ['Zindabazar', 'Amberkhana', 'Uposhohor', 'Chouhatta', 'Tilagarh'] },
      { en: 'South Surma', bn: 'দক্ষিণ সুরমা', aliases: ['south surma', 'দক্ষিণ সুরমা', 'কদমতলী', 'সিলেট স্টেশন'], areas: ['Kadamtoli', 'Silam', 'Moglabazar'] },
      { en: 'Golapganj', bn: 'গোলাপগঞ্জ', aliases: ['golapganj', 'গোলাপগঞ্জ', 'হেতিমগঞ্জ'], areas: ['Hetimganj', 'Dhaka Dakshin'] },
      { en: 'Beanibazar', bn: 'বিয়ানীবাজার', aliases: ['beanibazar', 'বিয়ানীবাজার', 'চারখাই'], areas: ['Charkhai', 'Kurar Bazar'] }
    ]
  },
  khulna: {
    en: 'Khulna',
    bn: 'খুলনা',
    aliases: ['khulna', 'খুলনা'],
    thanas: [
      { en: 'Khulna Sadar', bn: 'খুলনা সদর', aliases: ['khulna sadar', 'রয়েল মোড়', 'ডাকবাংলা', 'সোনাডাঙ্গা', 'sonadanga'], areas: ['Royal Mor', 'Dakbangla', 'Sonadanga'] },
      { en: 'Khalishpur', bn: 'খালিশপুর', aliases: ['khalishpur', 'খালিশপুর', 'বয়রা', 'boyra'], areas: ['Boyra', 'Peoples Mor', 'Mujgunni'] },
      { en: 'Daulatpur', bn: 'দৌলতপুর', aliases: ['daulatpur', 'দৌলতপুর', 'পাবলা', 'মহেশ্বরপাশা'], areas: ['Pabla', 'Moheswarpasha'] },
      { en: 'Rupsha', bn: 'রূপসা', aliases: ['rupsha', 'রূপসা', 'পূর্ব রূপসা'], areas: ['Rupsha Ferry', 'Noyapara'] }
    ]
  },
  comilla: {
    en: 'Comilla',
    bn: 'কুমিল্লা',
    aliases: ['comilla', 'cumilla', 'কুমিল্লা'],
    thanas: [
      { en: 'Comilla Sadar', bn: 'কুমিল্লা সদর', aliases: ['kandirpar', 'কান্দিরপাড়', 'শাসনগাছা', 'টমছম ব্রিজ', 'পদুয়ার বাজার'], areas: ['Kandirpar', 'Shasongasa', 'Tomsom Bridge', 'Paduar Bazar'] },
      { en: 'Daudkandi', bn: 'দাউদকান্দি', aliases: ['daudkandi', 'দাউদকান্দি', 'গৌরীপুর'], areas: ['Gouripur', 'Eliotganj'] },
      { en: 'Laksam', bn: 'লাকসাম', aliases: ['laksam', 'লাকসাম', 'দৌলতগঞ্জ'], areas: ['Dowlatganj', 'Uttarda'] },
      { en: 'Chandina', bn: 'চান্দিনা', aliases: ['chandina', 'চান্দিনা', 'বাগুর'], areas: ['Bagur', 'Madhaiya'] }
    ]
  },
  jessore: {
    en: 'Jessore',
    bn: 'যশোর',
    aliases: ['jessore', 'jashore', 'যশোর'],
    thanas: [
      { en: 'Jessore Sadar', bn: 'যশোর সদর', aliases: ['doratana', 'দড়াটানা', 'মনিহার', 'পালবাড়ি'], areas: ['Doratana', 'Monihar', 'Palbari'] },
      { en: 'Sharsha', bn: 'শার্শা', aliases: ['sharsha', 'শার্শা', 'বেনাপোল', 'benapole'], areas: ['Benapole', 'Navaron', 'Bagachra'] },
      { en: 'Jhikargacha', bn: 'ঝিকরগাছা', aliases: ['jhikargacha', 'ঝিকরগাছা', 'গদখালী'], areas: ['Gadkhali', 'Bankra'] }
    ]
  }
};

export function normalizeBanglaText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[,\.\-\/\\#()\[\]:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function banglaToPhonetic(str: string): string {
  const map: Record<string, string> = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', '্': '', 'ঁ': '', 'ং': 'ng', 'ঃ': ''
  };

  let res = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    res += map[char] !== undefined ? map[char] : char;
  }
  return res.toLowerCase();
}

export function levenshteinDistance(s1: string, s2: string): number {
  if (!s1 || !s2) return Math.max((s1 || '').length, (s2 || '').length);
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const dist = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - dist / maxLen;
}

// In-memory cache for Pathao cities, zones, and areas
const pathaoCache: {
  cities: any[];
  zones: Record<number, any[]>;
  areas: Record<number, any[]>;
} = {
  cities: [],
  zones: {},
  areas: {}
};

export function cleanRawAddress(rawAddress: string): string {
  if (!rawAddress) return '';
  return rawAddress
    .replace(/whatsapp|imo|viber|call|note|নাম|ফোন|ঠিকানা|কুরিয়ার|ডেলিভারি/gi, '')
    .replace(/\[TID:[^\]]+\]/gi, '')
    .replace(/Name\s*:\s*[^\n]+/gi, '')
    .replace(/Phone\s*:\s*[^\n]+/gi, '')
    .replace(/Delivery\s*Area\s*:\s*[^\n]+/gi, '')
    .replace(/Address\s*:\s*/gi, '')
    .replace(/(?:\+?88)?01[3-9]\d{8}/g, '')
    .replace(/\b\d{6,14}\b/g, '')
    .replace(/[,\.\-\/\\#()\[\]:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent Bangladesh Address Auto-Resolver
 */
export async function autoResolveBDLocation(
  rawAddress: string,
  pathaoConfig?: PathaoConfig,
  accessToken?: string
): Promise<ResolvedLocation> {
  const raw = rawAddress || '';
  const cleaned = cleanRawAddress(raw);

  const normalized = normalizeBanglaText(cleaned);

  let matchedDistrictName = 'Dhaka';
  let matchedDistrictBn = 'ঢাকা';
  let matchedThana = '';
  let matchedArea = '';
  let matchedDistrictObj: DistrictInfo | null = null;

  // 1. Detect District
  for (const [key, d] of Object.entries(BD_DISTRICTS)) {
    if (
      normalized.includes(d.bn) ||
      normalized.includes(d.en.toLowerCase()) ||
      d.aliases.some(a => normalized.includes(a.toLowerCase()))
    ) {
      matchedDistrictName = d.en;
      matchedDistrictBn = d.bn;
      matchedDistrictObj = d;
      break;
    }
  }

  // 2. Detect Thana & Area from District's Thana hierarchy
  if (matchedDistrictObj && matchedDistrictObj.thanas) {
    for (const t of matchedDistrictObj.thanas) {
      const isThanaMatch =
        normalized.includes(t.bn) ||
        normalized.includes(t.en.toLowerCase()) ||
        (t.aliases && t.aliases.some(a => normalized.includes(a.toLowerCase())));

      if (isThanaMatch) {
        matchedThana = t.en;

        if (t.areas) {
          for (const a of t.areas) {
            if (normalized.includes(a.toLowerCase())) {
              matchedArea = a;
              break;
            }
          }
        }
        break;
      }
    }
  }

  let resolvedCityId: number | undefined;
  let resolvedCityName = matchedDistrictName;
  let resolvedZoneId: number | undefined;
  let resolvedZoneName = matchedThana;
  let resolvedAreaId: number | undefined;
  let resolvedAreaName = matchedArea;

  // 3. Connect with Live Pathao Hierarchy if credentials provided
  if (pathaoConfig && accessToken) {
    try {
      if (pathaoCache.cities.length === 0) {
        const cList = await getPathaoCities(pathaoConfig, accessToken);
        if (cList && cList.length > 0) pathaoCache.cities = cList;
      }

      if (pathaoCache.cities.length > 0) {
        // Find best city
        let bestCity = pathaoCache.cities.find((c: any) =>
          c.city_name.toLowerCase().includes(matchedDistrictName.toLowerCase()) ||
          matchedDistrictName.toLowerCase().includes(c.city_name.toLowerCase())
        );

        if (!bestCity) {
          bestCity = pathaoCache.cities.find((c: any) => c.city_name.toLowerCase().includes('dhaka')) || pathaoCache.cities[0];
        }

        if (bestCity) {
          resolvedCityId = bestCity.city_id;
          resolvedCityName = bestCity.city_name;

          // Fetch Zones
          if (!pathaoCache.zones[bestCity.city_id]) {
            const zList = await getPathaoZones(bestCity.city_id, pathaoConfig, accessToken);
            if (zList && zList.length > 0) pathaoCache.zones[bestCity.city_id] = zList;
          }

          const zones = pathaoCache.zones[bestCity.city_id] || [];
          let bestZone: any = null;

          if (matchedThana) {
            bestZone = zones.find((z: any) =>
              z.zone_name.toLowerCase().includes(matchedThana.toLowerCase()) ||
              matchedThana.toLowerCase().includes(z.zone_name.toLowerCase()) ||
              banglaToPhonetic(z.zone_name).includes(banglaToPhonetic(matchedThana))
            );
          }

          if (!bestZone && zones.length > 0) {
            for (const z of zones) {
              if (normalized.includes(z.zone_name.toLowerCase()) || normalized.includes(banglaToPhonetic(z.zone_name))) {
                bestZone = z;
                break;
              }
            }
          }

          if (bestZone) {
            resolvedZoneId = bestZone.zone_id;
            resolvedZoneName = bestZone.zone_name;
            matchedThana = bestZone.zone_name;

            // Fetch Areas
            if (!pathaoCache.areas[bestZone.zone_id]) {
              const aList = await getPathaoAreas(bestZone.zone_id, pathaoConfig, accessToken);
              if (aList && aList.length > 0) pathaoCache.areas[bestZone.zone_id] = aList;
            }

            const areas = pathaoCache.areas[bestZone.zone_id] || [];
            let bestArea: any = null;

            if (matchedArea) {
              bestArea = areas.find((a: any) =>
                a.area_name.toLowerCase().includes(matchedArea.toLowerCase()) ||
                matchedArea.toLowerCase().includes(a.area_name.toLowerCase())
              );
            }

            if (!bestArea && areas.length > 0) {
              for (const a of areas) {
                if (normalized.includes(a.area_name.toLowerCase()) || normalized.includes(banglaToPhonetic(a.area_name))) {
                  bestArea = a;
                  break;
                }
              }
            }

            if (!bestArea && areas.length > 0) {
              bestArea = areas[0];
            }

            if (bestArea) {
              resolvedAreaId = bestArea.area_id;
              resolvedAreaName = bestArea.area_name;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Pathao auto-resolver warning:', e);
    }
  }

  const formattedSteadfastAddress = cleaned;

  return {
    cityId: resolvedCityId,
    cityName: resolvedCityName || matchedDistrictName,
    zoneId: resolvedZoneId,
    zoneName: resolvedZoneName || matchedThana,
    areaId: resolvedAreaId,
    areaName: resolvedAreaName || matchedArea,
    district: matchedDistrictName,
    thana: matchedThana || resolvedZoneName || 'Sadar',
    rawAddress: raw,
    formattedSteadfastAddress,
    confidence: resolvedAreaId ? 1.0 : (resolvedZoneId ? 0.8 : 0.5)
  };
}
