export interface BdDistrict {
  id: string;
  name: string;
  nameBn: string;
  isInsideDhaka: boolean;
  upazilas: string[];
}

export interface BdDivision {
  id: string;
  name: string;
  nameBn: string;
  districts: BdDistrict[];
}

export const BD_DIVISIONS: BdDivision[] = [
  {
    "id": "dhaka",
    "name": "Dhaka",
    "nameBn": "ঢাকা",
    "districts": [
      {
        "id": "dhaka",
        "name": "Dhaka",
        "nameBn": "ঢাকা",
        "isInsideDhaka": true,
        "upazilas": [
          "Dhanmondi / ধানমন্ডি",
          "Mirpur / মিরপুর",
          "Uttara / উত্তরা",
          "Gulshan / গুলশান",
          "Banani / বনানী",
          "Mohammadpur / মোহাম্মদপুর",
          "Badda / বাড্ডা",
          "Motijheel / মতিঝিল",
          "Paltan / পল্টন",
          "Khilgaon / খিলগাঁও",
          "Rampura / রামপুরা",
          "Jatrabari / যাত্রাবাড়ী",
          "Lalbagh / লালবাগ",
          "New Market / নিউ মার্কেট",
          "Tejgaon / তেজগাঁও",
          "Shahbagh / শাহবাগ",
          "Malibagh / মালিবাগ",
          "Moghbazar / মগবাজার",
          "Bashundhara / বসুন্ধরা",
          "Basabo / বাসাবো",
          "Shyampur / শ্যামপুর",
          "Demra / ডেমরা",
          "Kamrangirchar / কামরাঙ্গীরচর",
          "Khilkhet / খিলক্ষেত",
          "Cantonment / ক্যান্টনমেন্ট",
          "Savar / সাভার",
          "Dhamrai / ধামরাই",
          "Keraniganj / কেরানীগঞ্জ",
          "Nawabganj / নবাবগঞ্জ",
          "Dohar / দোহার"
        ]
      },
      {
        "id": "gazipur",
        "name": "Gazipur",
        "nameBn": "গাজীপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Gazipur Sadar / গাজীপুর সদর",
          "Tongi / টঙ্গী",
          "Kaliakair / কালিয়াকৈর",
          "Kapasia / কাপাসিয়া",
          "Sreepur / শ্রীপুর",
          "Kaliganj / কালীগঞ্জ"
        ]
      },
      {
        "id": "narayanganj",
        "name": "Narayanganj",
        "nameBn": "নারায়ণগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Narayanganj Sadar / নারায়ণগঞ্জ সদর",
          "Fatullah / ফতুল্লা",
          "Siddhirganj / সিদ্ধিরগঞ্জ",
          "Araihazar / আড়াইহাজার",
          "Bandar / বন্দর",
          "Rupganj / রূপগঞ্জ",
          "Sonargaon / সোনারগাঁও"
        ]
      },
      {
        "id": "tangail",
        "name": "Tangail",
        "nameBn": "টাঙ্গাইল",
        "isInsideDhaka": false,
        "upazilas": [
          "Tangail Sadar / টাঙ্গাইল সদর",
          "Gopalpur / গোপালপুর",
          "Basail / বাসাইল",
          "Bhuapur / ভূঞাপুর",
          "Delduar / দেলদুয়ার",
          "Ghatail / ঘাটাইল",
          "Kalihati / কালিহাতী",
          "Madhupur / মধুপুর",
          "Mirzapur / মির্জাপুর",
          "Nagarpur / নাগরপুর",
          "Sakhipur / সখিপুর",
          "Dhanbari / ধনবাড়ী"
        ]
      },
      {
        "id": "narsingdi",
        "name": "Narsingdi",
        "nameBn": "নরসিংদী",
        "isInsideDhaka": false,
        "upazilas": [
          "Narsingdi Sadar / নরসিংদী সদর",
          "Belabo / বেলাবো",
          "Monohardi / মনোহরদী",
          "Palash / পলাশ",
          "Raipura / রায়পুরা",
          "Shibpur / শিবপুর"
        ]
      },
      {
        "id": "faridpur",
        "name": "Faridpur",
        "nameBn": "ফরিদপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Faridpur Sadar / ফরিদপুর সদর",
          "Boalmari / বোয়ালমারী",
          "Alfadanga / আলফাডাঙ্গা",
          "Madhukhali / মধুখালী",
          "Bhanga / ভাঙ্গা",
          "Nagarkanda / নগরকান্দা",
          "Charbhadrasan / চরভদ্রাসন",
          "Sadarpur / সদরপুর",
          "Saltha / সালথা"
        ]
      },
      {
        "id": "manikganj",
        "name": "Manikganj",
        "nameBn": "মানিকগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Manikganj Sadar / মানিকগঞ্জ সদর",
          "Singair / সিংগাইর",
          "Shibalaya / শিবালয়",
          "Saturia / সাটুরিয়া",
          "Harirampur / হরিরামপুর",
          "Ghior / ঘিওর",
          "Daulatpur / দৌলতপুর"
        ]
      },
      {
        "id": "munshiganj",
        "name": "Munshiganj",
        "nameBn": "মুন্সিগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Munshiganj Sadar / মুন্সিগঞ্জ সদর",
          "Tongibari / টংগিবাড়ী",
          "Sirajdikhan / সিরাজদিখান",
          "Louhajang / লৌহজং",
          "Sreenagar / শ্রীনগর",
          "Gazaria / গজারিয়া"
        ]
      },
      {
        "id": "kishoreganj",
        "name": "Kishoreganj",
        "nameBn": "কিশোরগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Kishoreganj Sadar / কিশোরগঞ্জ সদর",
          "Bhairab / ভৈরব",
          "Bajitpur / বাজিতপুর",
          "Kuliarchar / কুলিয়ারচর",
          "Pakundia / পাকুন্দিয়া",
          "Katiadi / কটিয়াদী",
          "Karimganj / করিমগঞ্জ",
          "Tarail / তাড়াইল",
          "Hossainpur / হোসেনপুর",
          "Itna / ইটনা",
          "Mithamain / মিঠামইন",
          "Nikli / নিকলী",
          "Austagram / অষ্টগ্রাম"
        ]
      },
      {
        "id": "gopalganj",
        "name": "Gopalganj",
        "nameBn": "গোপালগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Gopalganj Sadar / গোপালগঞ্জ সদর",
          "Kashiani / কাশিয়ানী",
          "Kotalipara / কোটালীপাড়া",
          "Muksudpur / মুকসুদপুর",
          "Tungipara / টুঙ্গিপাড়া"
        ]
      },
      {
        "id": "madaripur",
        "name": "Madaripur",
        "nameBn": "মাদারীপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Madaripur Sadar / মাদারীপুর সদর",
          "Shibchar / শিবচর",
          "Kalkini / কালকিনি",
          "Rajoir / রাজৈর",
          "Dasar / ডাসার"
        ]
      },
      {
        "id": "rajbari",
        "name": "Rajbari",
        "nameBn": "রাজবাড়ী",
        "isInsideDhaka": false,
        "upazilas": [
          "Rajbari Sadar / রাজবাড়ী সদর",
          "Goalanda / গোয়ালন্দ",
          "Pangsha / পাংশা",
          "Baliakandi / বালিয়াকান্দি",
          "Kalukhali / কালুখালী"
        ]
      },
      {
        "id": "shariatpur",
        "name": "Shariatpur",
        "nameBn": "শরীয়তপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Shariatpur Sadar / শরীয়তপুর সদর",
          "Damudya / ডামুড্যা",
          "Naria / নড়িয়া",
          "Zajira / জাজিরা",
          "Bhedarganj / ভেদরগঞ্জ",
          "Gosairhat / গোসাইরহাট"
        ]
      }
    ]
  },
  {
    "id": "chattogram",
    "name": "Chattogram",
    "nameBn": "চট্টগ্রাম",
    "districts": [
      {
        "id": "chattogram",
        "name": "Chattogram",
        "nameBn": "চট্টগ্রাম",
        "isInsideDhaka": false,
        "upazilas": [
          "Kotwali / কোতোয়ালী",
          "Panchlaish / পাঁচলাইশ",
          "Agrabad / আগ্রাবাদ",
          "Halishahar / হালিশহর",
          "Khulshi / খুলশী",
          "Bakalia / বাকলিয়া",
          "Chandgaon / চান্দগাঁও",
          "Bayazid / বায়েজিদ",
          "Anwara / আনোয়ারা",
          "Banshkhali / বাঁশখালী",
          "Boalkhali / বোয়ালখালী",
          "Chandanaish / চন্দনাইশ",
          "Fatikchhari / ফটিকছড়ি",
          "Hathazari / হাটহাজারী",
          "Lohagara / লোহাগাড়া",
          "Mirsharai / মীরসরাই",
          "Patiya / পটিয়া",
          "Rangunia / রাঙ্গুনিয়া",
          "Raozan / রাউজান",
          "Sandwip / সন্দ্বীপ",
          "Satkania / সাতকানিয়া",
          "Sitakunda / সীতাকুণ্ড"
        ]
      },
      {
        "id": "coxsbazar",
        "name": "Cox's Bazar",
        "nameBn": "কক্সবাজার",
        "isInsideDhaka": false,
        "upazilas": [
          "Cox's Bazar Sadar / কক্সবাজার সদর",
          "Chakaria / চকোরিয়া",
          "Kutubdia / কুতুবদিয়া",
          "Maheshkhali / মহেশখালী",
          "Ramu / রামু",
          "Teknaf / টেকনাফ",
          "Ukhia / উখিয়া",
          "Pekua / পেকুয়া"
        ]
      },
      {
        "id": "cumilla",
        "name": "Cumilla",
        "nameBn": "কুমিল্লা",
        "isInsideDhaka": false,
        "upazilas": [
          "Cumilla Adarsha Sadar / আদর্শ সদর",
          "Sadar Dakshin / সদর দক্ষিণ",
          "Barura / বরুড়া",
          "Brahmanpara / ব্রাহ্মণপাড়া",
          "Burichang / বুড়িচং",
          "Chandina / চান্দিনা",
          "Chauddagram / চৌদ্দগ্রাম",
          "Daudkandi / দাউদকান্দি",
          "Debidwar / দেবীদ্বার",
          "Homna / হোমনা",
          "Laksam / লাকসাম",
          "Muradnagar / মুরাদনগর",
          "Nangalkot / নাঙ্গলকোট",
          "Meghna / মেঘনা",
          "Titas / তিতাস",
          "Monohargonj / মনোহরগঞ্জ",
          "Lalmai / লালমাই"
        ]
      },
      {
        "id": "feni",
        "name": "Feni",
        "nameBn": "ফেনী",
        "isInsideDhaka": false,
        "upazilas": [
          "Feni Sadar / ফেনী সদর",
          "Chhagalnaiya / ছাগলনাইয়া",
          "Daganbhuiyan / দাগনভূঞা",
          "Parshuram / পরশুরাম",
          "Fulgazi / ফুলগাজী",
          "Sonagazi / সোনাগাজী"
        ]
      },
      {
        "id": "brahmanbaria",
        "name": "Brahmanbaria",
        "nameBn": "ব্রাহ্মণবাড়িয়া",
        "isInsideDhaka": false,
        "upazilas": [
          "Brahmanbaria Sadar / ব্রাহ্মণবাড়িয়া সদর",
          "Ashuganj / আশুগঞ্জ",
          "Nasirnagar / নাসিরনগর",
          "Nabinagar / নবীনগর",
          "Sarail / সরাইল",
          "Kasba / কসবা",
          "Akhaura / আখাউড়া",
          "Bancharampur / বাঞ্ছারামপুর",
          "Bijoynagar / বিজয়নগর"
        ]
      },
      {
        "id": "noakhali",
        "name": "Noakhali",
        "nameBn": "নোয়াখালী",
        "isInsideDhaka": false,
        "upazilas": [
          "Noakhali Sadar / নোয়াখালী সদর",
          "Begumganj / বেগমগঞ্জ",
          "Chatkhil / চাটখিল",
          "Companiganj / কোম্পানীগঞ্জ",
          "Hatiya / হাতিয়া",
          "Senbagh / সেনবাগ",
          "Subarnachar / সুবর্ণচর",
          "Sonaimuri / সোনাইমুড়ী",
          "Kabirhat / কবিরহাট"
        ]
      },
      {
        "id": "chandpur",
        "name": "Chandpur",
        "nameBn": "চাঁদপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Chandpur Sadar / চাঁদপুর সদর",
          "Faridganj / ফরিদগঞ্জ",
          "Haimchar / হাইমচর",
          "Hajiganj / হাজীগঞ্জ",
          "Kachua / কচুয়া",
          "Matlab Dakshin / মতলব দক্ষিণ",
          "Matlab Uttar / মতলব উত্তর",
          "Shahrasti / শাহরাস্তি"
        ]
      },
      {
        "id": "lakshmipur",
        "name": "Lakshmipur",
        "nameBn": "লক্ষ্মীপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Lakshmipur Sadar / লক্ষ্মীপুর সদর",
          "Raipur / রায়পুর",
          "Ramganj / রামগঞ্জ",
          "Ramgati / রামগতি",
          "Komol Nagar / কমলনগর"
        ]
      },
      {
        "id": "rangamati",
        "name": "Rangamati",
        "nameBn": "রাঙ্গামাটি",
        "isInsideDhaka": false,
        "upazilas": [
          "Rangamati Sadar / রাঙ্গামাটি সদর",
          "Belaichhari / বিলাইছড়ি",
          "Bagaichhari / বাঘাইছড়ি",
          "Barkal / বরকল",
          "Jurachhari / জুরাছড়ি",
          "Kaptai / কাপ্তাই",
          "Kawkhali / কাউখালী",
          "Langadu / লংগদু",
          "Naniarchar / নানিয়ারচর",
          "Rajasthali / রাজস্থলী"
        ]
      },
      {
        "id": "bandarban",
        "name": "Bandarban",
        "nameBn": "বান্দরবান",
        "isInsideDhaka": false,
        "upazilas": [
          "Bandarban Sadar / বান্দরবান সদর",
          "Alikadam / আলীকদম",
          "Lama / লামা",
          "Naikhongchhari / নাইক্ষ্যংছড়ি",
          "Rowangchhari / রোয়াংছড়ি",
          "Ruma / রুমা",
          "Thanchi / থানচি"
        ]
      },
      {
        "id": "khagrachhari",
        "name": "Khagrachhari",
        "nameBn": "খাগড়াছড়ি",
        "isInsideDhaka": false,
        "upazilas": [
          "Khagrachhari Sadar / খাগড়াছড়ি সদর",
          "Dighinala / দিঘীনালা",
          "Lakshmichhari / লক্ষ্মীছড়ি",
          "Mahalchhari / মহালছড়ি",
          "Manikchhari / মানিকছড়ি",
          "Matiranga / মাটিরাঙ্গা",
          "Panchhari / পানছড়ি",
          "Ramgarh / রামগড়",
          "Guimara / গুইমারা"
        ]
      }
    ]
  },
  {
    "id": "rajshahi",
    "name": "Rajshahi",
    "nameBn": "রাজশাহী",
    "districts": [
      {
        "id": "rajshahi",
        "name": "Rajshahi",
        "nameBn": "রাজশাহী",
        "isInsideDhaka": false,
        "upazilas": [
          "Boalia / বোয়ালিয়া",
          "Motihar / মতিহার",
          "Rajpara / রাজপাড়া",
          "Shah Makhdum / শাহ মখদুম",
          "Bagha / বাঘা",
          "Bagmara / বাগমারা",
          "Charghat / চারঘাট",
          "Durgapur / দুর্গাপুর",
          "Godagari / গোদাগাড়ী",
          "Mohanpur / মোহনপুর",
          "Paba / পবা",
          "Puthia / পুঠিয়া",
          "Tanore / তানোর"
        ]
      },
      {
        "id": "bogura",
        "name": "Bogura",
        "nameBn": "বগুড়া",
        "isInsideDhaka": false,
        "upazilas": [
          "Bogura Sadar / বগুড়া সদর",
          "Adamdighi / আদমদিঘী",
          "Dhunat / ধুনট",
          "Dupchanchia / দুপচাঁচিয়া",
          "Gabtali / গাবতলী",
          "Kahaloo / কাহালু",
          "Nandigram / নন্দীগ্রাম",
          "Sariakandi / সারিয়াকান্দি",
          "Shajahanpur / শাজাহানপুর",
          "Sherpur / শেরপুর",
          "Shibganj / শিবগঞ্জ",
          "Sonatala / সোনাতলা"
        ]
      },
      {
        "id": "pabna",
        "name": "Pabna",
        "nameBn": "পাবনা",
        "isInsideDhaka": false,
        "upazilas": [
          "Pabna Sadar / পাবনা সদর",
          "Atgharia / আটঘরিয়া",
          "Bera / বেড়া",
          "Bhangura / ভাঙ্গুড়া",
          "Chatmohar / চাটমোহর",
          "Faridpur / ফরিদপুর",
          "Ishwardi / ঈশ্বরদী",
          "Santhia / সাঁথিয়া",
          "Sujanagar / সুজানগর"
        ]
      },
      {
        "id": "sirajganj",
        "name": "Sirajganj",
        "nameBn": "সিরাজগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Sirajganj Sadar / সিরাজগঞ্জ সদর",
          "Belkuchi / বেলকুচি",
          "Chauhali / চৌহালী",
          "Kamarkhanda / কামারখন্দ",
          "Kazipur / কাজীপুর",
          "Rayganj / রায়গঞ্জ",
          "Shahjadpur / শাহজাদপুর",
          "Tarash / তাড়াশ",
          "Ullapara / উল্লাপাড়া"
        ]
      },
      {
        "id": "naogaon",
        "name": "Naogaon",
        "nameBn": "নওগাঁ",
        "isInsideDhaka": false,
        "upazilas": [
          "Naogaon Sadar / নওগাঁ সদর",
          "Atrai / আত্রাই",
          "Badalgachhi / বদলগাছী",
          "Dhamoirhat / ধামইরহাট",
          "Manda / মান্দা",
          "Mohadevpur / মহাদেবপুর",
          "Niamatpur / নিয়ামতপুর",
          "Patnitala / পত্নীতলা",
          "Porsha / পোরশা",
          "Raninagar / রাণীনগর",
          "Sapahar / সাপাহার"
        ]
      },
      {
        "id": "natore",
        "name": "Natore",
        "nameBn": "নাটোর",
        "isInsideDhaka": false,
        "upazilas": [
          "Natore Sadar / নাটোর সদর",
          "Bagatipara / বাগাতিপাড়া",
          "Baraigram / বড়াইগ্রাম",
          "Gurudaspur / গুরুদাসপুর",
          "Lalpur / লালপুর",
          "Singra / সিংড়া",
          "Naldanga / নলডাঙ্গা"
        ]
      },
      {
        "id": "chapainawabganj",
        "name": "Chapainawabganj",
        "nameBn": "চাঁপাইনবাবগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Chapainawabganj Sadar / চাঁপাইনবাবগঞ্জ সদর",
          "Bholahat / ভোলাহাট",
          "Gomastapur / গোমস্তাপুর",
          "Nachole / নাচোল",
          "Shibganj / শিবগঞ্জ"
        ]
      },
      {
        "id": "joypurhat",
        "name": "Joypurhat",
        "nameBn": "জয়পুরহাট",
        "isInsideDhaka": false,
        "upazilas": [
          "Joypurhat Sadar / জয়পুরহাট সদর",
          "Akkelpur / আক্কেলপুর",
          "Kalai / কালাই",
          "Khetlal / ক্ষেতলাল",
          "Panchbibi / পাঁচবিবি"
        ]
      }
    ]
  },
  {
    "id": "khulna",
    "name": "Khulna",
    "nameBn": "খুলনা",
    "districts": [
      {
        "id": "khulna",
        "name": "Khulna",
        "nameBn": "খুলনা",
        "isInsideDhaka": false,
        "upazilas": [
          "Khulna Sadar / খুলনা সদর",
          "Sonadanga / সোনাডাঙ্গা",
          "Khalishpur / খালিশপুর",
          "Daulatpur / দৌলতপুর",
          "Khan Jahan Ali / খানজাহান আলী",
          "Batiaghata / বটিয়াঘাটা",
          "Dacope / দাকোপ",
          "Dumuria / ডুমুরিয়া",
          "Dighalia / দিঘলিয়া",
          "Koyra / কয়রা",
          "Paikgachha / পাইকগাছা",
          "Phultala / ফুলতলা",
          "Rupsha / রূপসা",
          "Terokhada / তেরখাদা"
        ]
      },
      {
        "id": "jashore",
        "name": "Jashore",
        "nameBn": "যশোর",
        "isInsideDhaka": false,
        "upazilas": [
          "Jashore Sadar / যশোর সদর",
          "Abhaynagar / অভয়নগর",
          "Bagherpara / বাঘারপাড়া",
          "Chaugachha / চৌগাছা",
          "Jhikargachha / ঝিকরগাছা",
          "Keshabpur / কেশবপুর",
          "Manirampur / মণিরামপুর",
          "Sharsha / শার্শা"
        ]
      },
      {
        "id": "kushtia",
        "name": "Kushtia",
        "nameBn": "কুষ্টিয়া",
        "isInsideDhaka": false,
        "upazilas": [
          "Kushtia Sadar / কুষ্টিয়া সদর",
          "Bheramara / ভেড়ামারা",
          "Daulatpur / দৌলতপুর",
          "Khoksa / খোকসা",
          "Kumarkhali / কুমারখালী",
          "Mirpur / মিরপুর"
        ]
      },
      {
        "id": "satkhira",
        "name": "Satkhira",
        "nameBn": "সাতক্ষীরা",
        "isInsideDhaka": false,
        "upazilas": [
          "Satkhira Sadar / সাতক্ষীরা সদর",
          "Assasuni / আশাশুনি",
          "Debhata / দেবহাটা",
          "Kalaroa / কলারোয়া",
          "Kaliganj / কালীগঞ্জ",
          "Shyamnagar / শ্যামনগর",
          "Tala / তালা"
        ]
      },
      {
        "id": "jhenaidah",
        "name": "Jhenaidah",
        "nameBn": "ঝিনাইদহ",
        "isInsideDhaka": false,
        "upazilas": [
          "Jhenaidah Sadar / ঝিনাইদহ সদর",
          "Harinakundu / হরিণাকুণ্ডু",
          "Kaliganj / কালীগঞ্জ",
          "Kotchandpur / কোটচাঁদপুর",
          "Maheshpur / মহেশপুর",
          "Shailkupa / শৈলকুপা"
        ]
      },
      {
        "id": "bagerhat",
        "name": "Bagerhat",
        "nameBn": "বাগেরহাট",
        "isInsideDhaka": false,
        "upazilas": [
          "Bagerhat Sadar / বাগেরহাট সদর",
          "Chitalmari / চিতলমারী",
          "Fakirhat / ফকিরহাট",
          "Kachua / কচুয়া",
          "Mollahat / মোল্লাহাট",
          "Mongla / মোংলা",
          "Morrelganj / মোরেলগঞ্জ",
          "Rampal / রামপাল",
          "Sarankhola / শরণখোলা"
        ]
      },
      {
        "id": "chuadanga",
        "name": "Chuadanga",
        "nameBn": "চুয়াডাঙ্গা",
        "isInsideDhaka": false,
        "upazilas": [
          "Chuadanga Sadar / চুয়াডাঙ্গা সদর",
          "Alamdanga / আলমডাঙ্গা",
          "Damurhuda / দামুড়হুদা",
          "Jibannagar / জীবননগর"
        ]
      },
      {
        "id": "meherpur",
        "name": "Meherpur",
        "nameBn": "মেহেরপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Meherpur Sadar / মেহেরপুর সদর",
          "Gangni / গাংনী",
          "Mujibnagar / মুজিবনগর"
        ]
      },
      {
        "id": "magura",
        "name": "Magura",
        "nameBn": "মাগুরা",
        "isInsideDhaka": false,
        "upazilas": [
          "Magura Sadar / মাগুরা সদর",
          "Mohammadpur / মোহাম্মদপুর",
          "Shalikha / শালিখা",
          "Sreepur / শ্রীপুর"
        ]
      },
      {
        "id": "narail",
        "name": "Narail",
        "nameBn": "নড়াইল",
        "isInsideDhaka": false,
        "upazilas": [
          "Narail Sadar / নড়াইল সদর",
          "Kalia / কালিয়া",
          "Lohagara / লোহাগড়া"
        ]
      }
    ]
  },
  {
    "id": "barishal",
    "name": "Barishal",
    "nameBn": "বরিশাল",
    "districts": [
      {
        "id": "barishal",
        "name": "Barishal",
        "nameBn": "বরিশাল",
        "isInsideDhaka": false,
        "upazilas": [
          "Barishal Sadar / বরিশাল সদর",
          "Agailjhara / আগৈলঝাড়া",
          "Babuganj / বাবুগঞ্জ",
          "Bakerganj / বাকেরগঞ্জ",
          "Banaripara / বানারীপাড়া",
          "Gaurnadi / গৌরনদী",
          "Hizla / হিজলা",
          "Mehendiganj / মেহেন্দিগঞ্জ",
          "Muladi / মুলাদী",
          "Wazirpur / উজিরপুর"
        ]
      },
      {
        "id": "patuakhali",
        "name": "Patuakhali",
        "nameBn": "পটুয়াখালী",
        "isInsideDhaka": false,
        "upazilas": [
          "Patuakhali Sadar / পটুয়াখালী সদর",
          "Bauphal / বাউফল",
          "Dashmina / দশমিনা",
          "Galachipa / গলাচিপা",
          "Kalapara / কলাপাড়া",
          "Mirzaganj / মির্জাগঞ্জ",
          "Rangabali / রাঙ্গাবালী",
          "Dumki / দুমকি"
        ]
      },
      {
        "id": "bhola",
        "name": "Bhola",
        "nameBn": "ভোলা",
        "isInsideDhaka": false,
        "upazilas": [
          "Bhola Sadar / ভোলা সদর",
          "Borhanuddin / বোরহানউদ্দিন",
          "Char Fasson / চরফ্যাশন",
          "Daulatkhan / দৌলতখান",
          "Lalmohan / লালমোহন",
          "Manpura / মনপুরা",
          "Tazumuddin / তজুমদ্দিন"
        ]
      },
      {
        "id": "pirojpur",
        "name": "Pirojpur",
        "nameBn": "পিরোজপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Pirojpur Sadar / পিরোজপুর সদর",
          "Bhandaria / ভাণ্ডারিয়া",
          "Kawkhali / কাউখালী",
          "Mathbaria / মঠবাড়িয়া",
          "Nazirpur / নাজিরপুর",
          "Nesarabad / নেছারাবাদ",
          "Indurkani / ইন্দুরকানী"
        ]
      },
      {
        "id": "barguna",
        "name": "Barguna",
        "nameBn": "বরগুনা",
        "isInsideDhaka": false,
        "upazilas": [
          "Barguna Sadar / বরগুনা সদর",
          "Amtali / আমতলী",
          "Bamna / বামনা",
          "Betagi / বেতাগী",
          "Patharghata / পাথরঘাটা",
          "Taltali / তালতলী"
        ]
      },
      {
        "id": "jhalokathi",
        "name": "Jhalokathi",
        "nameBn": "ঝালকাঠি",
        "isInsideDhaka": false,
        "upazilas": [
          "Jhalokathi Sadar / ঝালকাঠি সদর",
          "Kathalia / কাঁঠালিয়া",
          "Nalchity / নলছিটি",
          "Rajapur / রাজাপুর"
        ]
      }
    ]
  },
  {
    "id": "sylhet",
    "name": "Sylhet",
    "nameBn": "সিলেট",
    "districts": [
      {
        "id": "sylhet",
        "name": "Sylhet",
        "nameBn": "সিলেট",
        "isInsideDhaka": false,
        "upazilas": [
          "Sylhet Sadar / সিলেট সদর",
          "South Surma / দক্ষিণ সুরমা",
          "Balaganj / বালাগঞ্জ",
          "Beanibazar / বিয়ানীবাজার",
          "Bishwanath / বিশ্বনাথ",
          "Companiganj / কোম্পানীগঞ্জ",
          "Fenchuganj / ফেঞ্চুগঞ্জ",
          "Golapganj / গোলাপগঞ্জ",
          "Gowainghat / গোয়াইনঘাট",
          "Jaintiapur / জৈন্তাপুর",
          "Kanaighat / কানাইঘাট",
          "Zakiganj / জকিগঞ্জ",
          "Osmani Nagar / ওসমানীনগর"
        ]
      },
      {
        "id": "moulvibazar",
        "name": "Moulvibazar",
        "nameBn": "মৌলভীবাজার",
        "isInsideDhaka": false,
        "upazilas": [
          "Moulvibazar Sadar / মৌলভীবাজার সদর",
          "Barlekha / বড়লেখা",
          "Juri / জুড়ী",
          "Kamalganj / কমলগঞ্জ",
          "Kulaura / কুলাউড়া",
          "Rajnagar / রাজনগর",
          "Sreemangal / শ্রীমঙ্গল"
        ]
      },
      {
        "id": "habiganj",
        "name": "Habiganj",
        "nameBn": "হবিগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Habiganj Sadar / হবিগঞ্জ সদর",
          "Ajmiriganj / আজমিরীগঞ্জ",
          "Bahubal / বাহুবল",
          "Baniyachong / বানিয়াচং",
          "Chunarughat / চুনারুঘাট",
          "Lakhai / লাখাই",
          "Madhabpur / মাধবপুর",
          "Nabiganj / নবীগঞ্জ",
          "Sayestaganj / শায়েস্তাগঞ্জ"
        ]
      },
      {
        "id": "sunamganj",
        "name": "Sunamganj",
        "nameBn": "সুনামগঞ্জ",
        "isInsideDhaka": false,
        "upazilas": [
          "Sunamganj Sadar / সুনামগঞ্জ সদর",
          "Bishwamvarpur / বিশ্বম্ভরপুর",
          "Chhatak / ছাতক",
          "Derai / দিরাই",
          "Dharampasha / ধর্মপাশা",
          "Dowarabazar / দোয়ারাবাজার",
          "Jagannathpur / জগন্নাথপুর",
          "Jamalganj / জামালগঞ্জ",
          "Sulla / শাল্লা",
          "Tahirpur / তাহিরপুর",
          "Shantiganj / শান্তিগঞ্জ",
          "Madhyanagar / মধ্যনগর"
        ]
      }
    ]
  },
  {
    "id": "rangpur",
    "name": "Rangpur",
    "nameBn": "রংপুর",
    "districts": [
      {
        "id": "rangpur",
        "name": "Rangpur",
        "nameBn": "রংপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Rangpur Sadar / রংপুর সদর",
          "Badarganj / বদরগঞ্জ",
          "Gangachhara / গংগাচড়া",
          "Kaunia / কাউনিয়া",
          "Mithapukur / মিঠাপুকুর",
          "Pirgachha / পীরগাছা",
          "Pirganj / পীরগঞ্জ",
          "Taraganj / তারাগঞ্জ"
        ]
      },
      {
        "id": "dinajpur",
        "name": "Dinajpur",
        "nameBn": "দিনাজপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Dinajpur Sadar / দিনাজপুর সদর",
          "Birampur / বিরামপুর",
          "Birganj / বীরগঞ্জ",
          "Birol / বিরল",
          "Bochaganj / বোচাগঞ্জ",
          "Chirirbandar / চিরিরবন্দর",
          "Fulbari / ফুলবাড়ী",
          "Ghoraghat / ঘোড়াঘাট",
          "Hakimpur / হাকিমপুর",
          "Kaharole / কাহারোল",
          "Khansama / খানসামা",
          "Nawabganj / নবাবগঞ্জ",
          "Parbatipur / পার্বতীপুর"
        ]
      },
      {
        "id": "kurigram",
        "name": "Kurigram",
        "nameBn": "কুড়িগ্রাম",
        "isInsideDhaka": false,
        "upazilas": [
          "Kurigram Sadar / কুড়িগ্রাম সদর",
          "Bhurungamari / ভুরুঙ্গামারী",
          "Char Rajibpur / চর রাজিবপুর",
          "Chilmari / চিলমারী",
          "Phulbari / ফুলবাড়ী",
          "Nageshwari / নাগেশ্বরী",
          "Rajarhat / রাজারহাট",
          "Raomari / রৌমারী",
          "Ulipur / উলিপুর"
        ]
      },
      {
        "id": "gaibandha",
        "name": "Gaibandha",
        "nameBn": "গাইবান্ধা",
        "isInsideDhaka": false,
        "upazilas": [
          "Gaibandha Sadar / গাইবান্ধা সদর",
          "Fulchhari / ফুলছড়ি",
          "Gobindaganj / গোবিন্দগঞ্জ",
          "Palashbari / পলাশবাড়ী",
          "Sadullapur / সাদুল্লাপুর",
          "Sughatta / সাঘাটা",
          "Sundarganj / সুন্দরগঞ্জ"
        ]
      },
      {
        "id": "nilphamari",
        "name": "Nilphamari",
        "nameBn": "নীলফামারী",
        "isInsideDhaka": false,
        "upazilas": [
          "Nilphamari Sadar / নীলফামারী সদর",
          "Dimla / ডিমলা",
          "Domar / ডোমার",
          "Jaldhaka / জলঢাকা",
          "Kishoreganj / কিশোরগঞ্জ",
          "Syedpur / সৈয়দপুর"
        ]
      },
      {
        "id": "panchagarh",
        "name": "Panchagarh",
        "nameBn": "পঞ্চগড়",
        "isInsideDhaka": false,
        "upazilas": [
          "Panchagarh Sadar / পঞ্চগড় সদর",
          "Atwari / আটওয়ারী",
          "Boda / বোদা",
          "Debiganj / দেবীগঞ্জ",
          "Tetulia / তেঁতুলিয়া"
        ]
      },
      {
        "id": "thakurgaon",
        "name": "Thakurgaon",
        "nameBn": "ঠাকুরগাঁও",
        "isInsideDhaka": false,
        "upazilas": [
          "Thakurgaon Sadar / ঠাকুরগাঁও সদর",
          "Baliadangi / বালিয়াডাঙ্গী",
          "Haripur / হরিপুর",
          "Pirganj / পীরগঞ্জ",
          "Ranisankail / রানীশংকৈল"
        ]
      },
      {
        "id": "lalmonirhat",
        "name": "Lalmonirhat",
        "nameBn": "লালমনিরহাট",
        "isInsideDhaka": false,
        "upazilas": [
          "Lalmonirhat Sadar / লালমনিরহাট সদর",
          "Aditmari / আদিতমারী",
          "Hatibandha / হাতীবান্ধা",
          "Kaliganj / কালীগঞ্জ",
          "Patgram / পাটগ্রাম"
        ]
      }
    ]
  },
  {
    "id": "mymensingh",
    "name": "Mymensingh",
    "nameBn": "ময়মনসিংহ",
    "districts": [
      {
        "id": "mymensingh",
        "name": "Mymensingh",
        "nameBn": "ময়মনসিংহ",
        "isInsideDhaka": false,
        "upazilas": [
          "Mymensingh Sadar / ময়মনসিংহ সদর",
          "Valuka / ভালুকা",
          "Dhobaura / ধোবাউড়া",
          "Fulbaria / ফুলবাড়ীয়া",
          "Gaffargaon / গফরগাঁও",
          "Gauripur / গৌরীপুর",
          "Haluaghat / হালুয়াঘাট",
          "Ishwarganj / ঈশ্বরগঞ্জ",
          "Muktagachha / মুক্তাগাছা",
          "Nandail / নান্দাইল",
          "Phulpur / ফুলপুর",
          "Trishal / ত্রিশাল",
          "Tarakanda / তারাকান্দা"
        ]
      },
      {
        "id": "jamalpur",
        "name": "Jamalpur",
        "nameBn": "জামালপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Jamalpur Sadar / জামালপুর সদর",
          "Bakshiganj / বকশীগঞ্জ",
          "Dewanganj / দেওয়ানগঞ্জ",
          "Islampur / ইসলামপুর",
          "Madarganj / মাদারগঞ্জ",
          "Melandaha / মেলান্দহ",
          "Sarishabari / সরিষাবাড়ী"
        ]
      },
      {
        "id": "netrokona",
        "name": "Netrokona",
        "nameBn": "নেত্রকোণা",
        "isInsideDhaka": false,
        "upazilas": [
          "Netrokona Sadar / নেত্রকোণা সদর",
          "Atpara / আটপাড়া",
          "Barhatta / বারহাট্টা",
          "Durgapur / দুর্গাপুর",
          "Kalmakanda / কলমাকান্দা",
          "Kendua / কেন্দুয়া",
          "Madan / মদন",
          "Mohanganj / মোহনগঞ্জ",
          "Purbadhala / পূর্বধলা",
          "Khaliajuri / খালিয়াজুড়ি"
        ]
      },
      {
        "id": "sherpur",
        "name": "Sherpur",
        "nameBn": "শেরপুর",
        "isInsideDhaka": false,
        "upazilas": [
          "Sherpur Sadar / শেরপুর সদর",
          "Jhenaigati / ঝিনাইগাতী",
          "Nakla / নকলা",
          "Nalitabari / নালিতাবাড়ী",
          "Sreebardi / শ্রীবরদী"
        ]
      }
    ]
  }
];

export const getDivisions = () => BD_DIVISIONS.map(d => ({ id: d.id, name: d.name, nameBn: d.nameBn }));

export const getDistrictsByDivision = (divisionId: string): BdDistrict[] => {
  if (!divisionId) return [];
  const division = BD_DIVISIONS.find(d => d.id === divisionId);
  return division ? division.districts : [];
};

export const getAllDistricts = (): (BdDistrict & { divisionId: string; divisionName: string; divisionNameBn: string })[] => {
  return BD_DIVISIONS.flatMap(div =>
    div.districts.map(dist => ({
      ...dist,
      divisionId: div.id,
      divisionName: div.name,
      divisionNameBn: div.nameBn,
    }))
  );
};

export const findDistrictById = (districtId: string): BdDistrict | undefined => {
  if (!districtId) return undefined;
  const normalized = districtId.toLowerCase().trim();
  for (const div of BD_DIVISIONS) {
    const match = div.districts.find(d => 
      d.id === normalized || 
      d.name.toLowerCase() === normalized || 
      d.nameBn === districtId ||
      normalized.includes(d.id)
    );
    if (match) return match;
  }
  return undefined;
};

export const getUpazilasByDistrict = (districtId: string): string[] => {
  const district = findDistrictById(districtId);
  return district ? district.upazilas : [];
};

export const isDistrictInsideDhaka = (districtId: string): boolean => {
  const district = findDistrictById(districtId);
  if (district) return district.isInsideDhaka;
  return /dhaka|ঢাকা/i.test(districtId);
};

export const parseDistrictDeliveryRates = (jsonString?: string): Record<string, number> => {
  if (!jsonString) return {};
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (parsed && typeof parsed === 'object') {
      const cleaned: Record<string, number> = {};
      Object.entries(parsed).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num >= 0) {
          cleaned[k.toLowerCase().trim()] = num;
        }
      });
      return cleaned;
    }
  } catch (e) {
    console.warn('Failed to parse district_delivery_rates JSON:', e);
  }
  return {};
};

export const getDeliveryChargeForDistrict = (
  districtId: string,
  settings: {
    delivery_charge_type?: string;
    flat_delivery_charge?: string | number;
    delivery_charge_inside_dhaka?: string | number;
    delivery_charge_outside_dhaka?: string | number;
    district_delivery_rates?: string;
  }
): { charge: number; area: 'inside_dhaka' | 'outside_dhaka'; isCustomRate: boolean } => {
  const isFlat = settings.delivery_charge_type === 'flat';
  const insideDhakaRate = Number(settings.delivery_charge_inside_dhaka ?? 80);
  const outsideDhakaRate = Number(settings.delivery_charge_outside_dhaka ?? 150);
  const flatRate = Number(settings.flat_delivery_charge ?? 120);

  const district = findDistrictById(districtId);
  const isInside = district ? district.isInsideDhaka : isDistrictInsideDhaka(districtId);
  const area: 'inside_dhaka' | 'outside_dhaka' = isInside ? 'inside_dhaka' : 'outside_dhaka';

  if (isFlat) {
    return { charge: flatRate, area, isCustomRate: false };
  }

  const customRates = parseDistrictDeliveryRates(settings.district_delivery_rates);
  const districtKey = district ? district.id : districtId.toLowerCase().trim();

  if (customRates[districtKey] !== undefined) {
    return { charge: customRates[districtKey], area, isCustomRate: true };
  }

  return {
    charge: isInside ? insideDhakaRate : outsideDhakaRate,
    area,
    isCustomRate: false
  };
};
