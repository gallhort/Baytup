/**
 * Base de données des villes algériennes
 * Alternative gratuite à Google Places API Autocomplete
 *
 * Données: Wilaya (provinces) et communes principales d'Algérie
 * Coordonnées: [latitude, longitude] format Google Maps
 */

const algerianCities = [
  // Alger (16)
  { id: 1, name: 'Alger', nameAr: 'الجزائر', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7538, 3.0588], population: 3000000 },
  { id: 2, name: 'Bab El Oued', nameAr: 'باب الواد', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7833, 3.0500], population: 150000 },
  { id: 3, name: 'Birkhadem', nameAr: 'بئر خادم', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7167, 3.0500], population: 100000 },
  { id: 4, name: 'Kouba', nameAr: 'القبة', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7333, 3.0833], population: 80000 },
  { id: 5, name: 'Hussein Dey', nameAr: 'حسين داي', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7333, 3.1000], population: 50000 },
  { id: 6, name: 'Cheraga', nameAr: 'الشراقة', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7667, 2.9667], population: 85000 },
  { id: 7, name: 'Draria', nameAr: 'الدرارية', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7167, 2.9833], population: 45000 },
  { id: 8, name: 'Zeralda', nameAr: 'زرالدة', wilaya: 'Alger', wilayaCode: 16, coordinates: [36.7000, 2.8333], population: 40000 },

  // Oran (31)
  { id: 9, name: 'Oran', nameAr: 'وهران', wilaya: 'Oran', wilayaCode: 31, coordinates: [35.6969, -0.6331], population: 1000000 },
  { id: 10, name: 'Bir El Djir', nameAr: 'بئر الجير', wilaya: 'Oran', wilayaCode: 31, coordinates: [35.7167, -0.5833], population: 75000 },
  { id: 11, name: 'Es Senia', nameAr: 'السانية', wilaya: 'Oran', wilayaCode: 31, coordinates: [35.6500, -0.6167], population: 65000 },
  { id: 12, name: 'Arzew', nameAr: 'أرزيو', wilaya: 'Oran', wilayaCode: 31, coordinates: [35.8500, -0.3167], population: 70000 },

  // Constantine (25)
  { id: 13, name: 'Constantine', nameAr: 'قسنطينة', wilaya: 'Constantine', wilayaCode: 25, coordinates: [36.3650, 6.6147], population: 450000 },
  { id: 14, name: 'El Khroub', nameAr: 'الخروب', wilaya: 'Constantine', wilayaCode: 25, coordinates: [36.2833, 6.6833], population: 180000 },
  { id: 15, name: 'Ain Smara', nameAr: 'عين السمارة', wilaya: 'Constantine', wilayaCode: 25, coordinates: [36.3833, 6.6000], population: 90000 },

  // Annaba (23)
  { id: 16, name: 'Annaba', nameAr: 'عنابة', wilaya: 'Annaba', wilayaCode: 23, coordinates: [36.9000, 7.7667], population: 260000 },
  { id: 17, name: 'El Bouni', nameAr: 'البوني', wilaya: 'Annaba', wilayaCode: 23, coordinates: [36.8667, 7.7333], population: 110000 },

  // Blida (09)
  { id: 18, name: 'Blida', nameAr: 'البليدة', wilaya: 'Blida', wilayaCode: 9, coordinates: [36.4814, 2.8277], population: 180000 },
  { id: 19, name: 'Boufarik', nameAr: 'بوفاريك', wilaya: 'Blida', wilayaCode: 9, coordinates: [36.5667, 2.9167], population: 60000 },
  { id: 20, name: 'Bougara', nameAr: 'بوقرة', wilaya: 'Blida', wilayaCode: 9, coordinates: [36.5500, 3.0833], population: 35000 },

  // Batna (05)
  { id: 21, name: 'Batna', nameAr: 'باتنة', wilaya: 'Batna', wilayaCode: 5, coordinates: [35.5559, 6.1742], population: 290000 },
  { id: 22, name: 'Barika', nameAr: 'بريكة', wilaya: 'Batna', wilayaCode: 5, coordinates: [35.3833, 5.3667], population: 85000 },

  // Sétif (19)
  { id: 23, name: 'Sétif', nameAr: 'سطيف', wilaya: 'Sétif', wilayaCode: 19, coordinates: [36.1833, 5.4167], population: 290000 },
  { id: 24, name: 'El Eulma', nameAr: 'العلمة', wilaya: 'Sétif', wilayaCode: 19, coordinates: [36.1500, 5.6833], population: 120000 },

  // Béjaïa (06)
  { id: 25, name: 'Béjaïa', nameAr: 'بجاية', wilaya: 'Béjaïa', wilayaCode: 6, coordinates: [36.7525, 5.0556], population: 180000 },
  { id: 26, name: 'Akbou', nameAr: 'أقبو', wilaya: 'Béjaïa', wilayaCode: 6, coordinates: [36.4667, 4.5333], population: 52000 },

  // Tlemcen (13)
  { id: 27, name: 'Tlemcen', nameAr: 'تلمسان', wilaya: 'Tlemcen', wilayaCode: 13, coordinates: [34.8781, -1.3150], population: 140000 },
  { id: 28, name: 'Maghnia', nameAr: 'مغنية', wilaya: 'Tlemcen', wilayaCode: 13, coordinates: [34.8500, -1.7333], population: 95000 },

  // Biskra (07)
  { id: 29, name: 'Biskra', nameAr: 'بسكرة', wilaya: 'Biskra', wilayaCode: 7, coordinates: [34.8500, 5.7333], population: 205000 },
  { id: 30, name: 'Sidi Okba', nameAr: 'سيدي عقبة', wilaya: 'Biskra', wilayaCode: 7, coordinates: [34.7500, 5.8833], population: 35000 },

  // Tizi Ouzou (15)
  { id: 31, name: 'Tizi Ouzou', nameAr: 'تيزي وزو', wilaya: 'Tizi Ouzou', wilayaCode: 15, coordinates: [36.7000, 4.0500], population: 145000 },
  { id: 32, name: 'Azazga', nameAr: 'عزازقة', wilaya: 'Tizi Ouzou', wilayaCode: 15, coordinates: [36.7333, 4.3667], population: 30000 },

  // Sidi Bel Abbès (22)
  { id: 33, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', wilaya: 'Sidi Bel Abbès', wilayaCode: 22, coordinates: [35.1900, -0.6400], population: 210000 },

  // Mostaganem (27)
  { id: 34, name: 'Mostaganem', nameAr: 'مستغانم', wilaya: 'Mostaganem', wilayaCode: 27, coordinates: [35.9311, 0.0900], population: 145000 },

  // Bordj Bou Arreridj (34)
  { id: 35, name: 'Bordj Bou Arreridj', nameAr: 'برج بوعريريج', wilaya: 'Bordj Bou Arreridj', wilayaCode: 34, coordinates: [36.0667, 4.7667], population: 135000 },

  // Skikda (21)
  { id: 36, name: 'Skikda', nameAr: 'سكيكدة', wilaya: 'Skikda', wilayaCode: 21, coordinates: [36.8761, 6.9086], population: 165000 },

  // Chlef (02)
  { id: 37, name: 'Chlef', nameAr: 'الشلف', wilaya: 'Chlef', wilayaCode: 2, coordinates: [36.1694, 1.3347], population: 180000 },

  // Tiaret (14)
  { id: 38, name: 'Tiaret', nameAr: 'تيارت', wilaya: 'Tiaret', wilayaCode: 14, coordinates: [35.3708, 1.3225], population: 180000 },

  // Béchar (08)
  { id: 39, name: 'Béchar', nameAr: 'بشار', wilaya: 'Béchar', wilayaCode: 8, coordinates: [31.6167, -2.2167], population: 165000 },

  // Médéa (26)
  { id: 40, name: 'Médéa', nameAr: 'المدية', wilaya: 'Médéa', wilayaCode: 26, coordinates: [36.2667, 2.7500], population: 125000 },

  // Djelfa (17)
  { id: 41, name: 'Djelfa', nameAr: 'الجلفة', wilaya: 'Djelfa', wilayaCode: 17, coordinates: [34.6667, 3.2500], population: 265000 },

  // Jijel (18)
  { id: 42, name: 'Jijel', nameAr: 'جيجل', wilaya: 'Jijel', wilayaCode: 18, coordinates: [36.8186, 5.7667], population: 131000 },

  // El Oued (39)
  { id: 43, name: 'El Oued', nameAr: 'الوادي', wilaya: 'El Oued', wilayaCode: 39, coordinates: [33.3667, 6.8667], population: 135000 },

  // Ouargla (30)
  { id: 44, name: 'Ouargla', nameAr: 'ورقلة', wilaya: 'Ouargla', wilayaCode: 30, coordinates: [31.9500, 5.3333], population: 165000 },
  { id: 45, name: 'Touggourt', nameAr: 'تقرت', wilaya: 'Ouargla', wilayaCode: 30, coordinates: [33.1000, 6.0667], population: 60000 },

  // Laghouat (03)
  { id: 46, name: 'Laghouat', nameAr: 'الأغواط', wilaya: 'Laghouat', wilayaCode: 3, coordinates: [33.8000, 2.8667], population: 135000 },

  // Ghardaïa (47)
  { id: 47, name: 'Ghardaïa', nameAr: 'غرداية', wilaya: 'Ghardaïa', wilayaCode: 47, coordinates: [32.4833, 3.6667], population: 93000 },

  // Tamanrasset (11)
  { id: 48, name: 'Tamanrasset', nameAr: 'تمنراست', wilaya: 'Tamanrasset', wilayaCode: 11, coordinates: [22.7850, 5.5228], population: 92635 },

  // Adrar (01)
  { id: 49, name: 'Adrar', nameAr: 'أدرار', wilaya: 'Adrar', wilayaCode: 1, coordinates: [27.8667, -0.2833], population: 64781 },

  // Tindouf (37)
  { id: 50, name: 'Tindouf', nameAr: 'تندوف', wilaya: 'Tindouf', wilayaCode: 37, coordinates: [27.6667, -8.1333], population: 58000 },

  // Tipaza (42)
  { id: 51, name: 'Tipaza', nameAr: 'تيبازة', wilaya: 'Tipaza', wilayaCode: 42, coordinates: [36.5833, 2.4500], population: 28225 },
  { id: 52, name: 'Koléa', nameAr: 'القليعة', wilaya: 'Tipaza', wilayaCode: 42, coordinates: [36.6333, 2.7667], population: 46000 },

  // Boumerdès (35)
  { id: 53, name: 'Boumerdès', nameAr: 'بومرداس', wilaya: 'Boumerdès', wilayaCode: 35, coordinates: [36.7667, 3.4667], population: 45000 },
  { id: 54, name: 'Dellys', nameAr: 'دلس', wilaya: 'Boumerdès', wilayaCode: 35, coordinates: [36.9167, 3.9167], population: 33000 },

  // Bouira (10)
  { id: 55, name: 'Bouira', nameAr: 'البويرة', wilaya: 'Bouira', wilayaCode: 10, coordinates: [36.3667, 3.9000], population: 75000 },

  // Guelma (24)
  { id: 56, name: 'Guelma', nameAr: 'قالمة', wilaya: 'Guelma', wilayaCode: 24, coordinates: [36.4667, 7.4333], population: 120000 },

  // Souk Ahras (41)
  { id: 57, name: 'Souk Ahras', nameAr: 'سوق أهراس', wilaya: 'Souk Ahras', wilayaCode: 41, coordinates: [36.2833, 7.9500], population: 115000 },

  // M'Sila (28)
  { id: 58, name: 'M\'Sila', nameAr: 'المسيلة', wilaya: 'M\'Sila', wilayaCode: 28, coordinates: [35.7000, 4.5333], population: 125000 },

  // Mascara (29)
  { id: 59, name: 'Mascara', nameAr: 'معسكر', wilaya: 'Mascara', wilayaCode: 29, coordinates: [35.4000, 0.1333], population: 110000 },

  // Khenchela (40)
  { id: 60, name: 'Khenchela', nameAr: 'خنشلة', wilaya: 'Khenchela', wilayaCode: 40, coordinates: [35.4333, 7.1500], population: 100000 },

  // Oum El Bouaghi (04)
  { id: 61, name: 'Oum El Bouaghi', nameAr: 'أم البواقي', wilaya: 'Oum El Bouaghi', wilayaCode: 4, coordinates: [35.8667, 7.1167], population: 100000 },

  // Tébessa (12)
  { id: 62, name: 'Tébessa', nameAr: 'تبسة', wilaya: 'Tébessa', wilayaCode: 12, coordinates: [35.4000, 8.1167], population: 195000 },

  // El Tarf (36)
  { id: 63, name: 'El Tarf', nameAr: 'الطارف', wilaya: 'El Tarf', wilayaCode: 36, coordinates: [36.7667, 8.3167], population: 25000 },

  // Saïda (20)
  { id: 64, name: 'Saïda', nameAr: 'سعيدة', wilaya: 'Saïda', wilayaCode: 20, coordinates: [34.8500, 0.1500], population: 130000 },

  // Relizane (48)
  { id: 65, name: 'Relizane', nameAr: 'غليزان', wilaya: 'Relizane', wilayaCode: 48, coordinates: [35.7500, 0.5500], population: 130000 },

  // Ain Defla (44)
  { id: 66, name: 'Ain Defla', nameAr: 'عين الدفلى', wilaya: 'Ain Defla', wilayaCode: 44, coordinates: [36.2667, 1.9667], population: 100000 },

  // Ain Temouchent (46)
  { id: 67, name: 'Ain Temouchent', nameAr: 'عين تموشنت', wilaya: 'Ain Temouchent', wilayaCode: 46, coordinates: [35.2833, -1.1333], population: 70000 },

  // Tissemsilt (38)
  { id: 68, name: 'Tissemsilt', nameAr: 'تيسمسيلت', wilaya: 'Tissemsilt', wilayaCode: 38, coordinates: [35.6167, 1.8167], population: 60000 },

  // El Bayadh (32)
  { id: 69, name: 'El Bayadh', nameAr: 'البيض', wilaya: 'El Bayadh', wilayaCode: 32, coordinates: [33.6833, 1.0167], population: 70000 },

  // Naâma (45)
  { id: 70, name: 'Naâma', nameAr: 'النعامة', wilaya: 'Naâma', wilayaCode: 45, coordinates: [33.2667, -0.3167], population: 25000 },

  // Illizi (33)
  { id: 71, name: 'Illizi', nameAr: 'إليزي', wilaya: 'Illizi', wilayaCode: 33, coordinates: [26.5000, 8.4833], population: 10000 },

  // Mila (43)
  { id: 72, name: 'Mila', nameAr: 'ميلة', wilaya: 'Mila', wilayaCode: 43, coordinates: [36.4500, 6.2667], population: 75000 }
];

module.exports = algerianCities;
