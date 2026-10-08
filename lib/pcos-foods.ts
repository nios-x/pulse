export type FoodTag = 'protein' | 'fiber' | 'fermented' | 'anti_inflammatory' | 'high_carb' | 'moderate_carb' | 'low_carb' | 'healthy_fat' | 'probiotic';

export type PcosFood = {
  key: string;
  labelEn: string;
  labelHi: string;
  tags: FoodTag[];
  pcosNote: { en: string; hi: string };
};

export const pcosFoods: Record<string, PcosFood> = {
  dal: {
    key: 'dal', labelEn: 'Dal', labelHi: 'दाल', tags: ['protein', 'moderate_carb', 'fiber'],
    pcosNote: { en: 'Good source of plant protein', hi: 'पौधे आधारित प्रोटीन का अच्छा स्रोत' }
  },
  curd: {
    key: 'curd', labelEn: 'Curd/Yogurt', labelHi: 'दही', tags: ['protein', 'probiotic', 'fermented'],
    pcosNote: { en: 'Great for gut health', hi: 'आंत के स्वास्थ्य के लिए बढ़िया' }
  },
  paneer: {
    key: 'paneer', labelEn: 'Paneer', labelHi: 'पनीर', tags: ['protein', 'healthy_fat', 'low_carb'],
    pcosNote: { en: 'Excellent protein and fat source', hi: 'प्रोटीन और वसा का बेहतरीन स्रोत' }
  },
  eggs: {
    key: 'eggs', labelEn: 'Eggs', labelHi: 'अंडे', tags: ['protein', 'healthy_fat', 'low_carb'],
    pcosNote: { en: 'Perfect balanced protein', hi: 'बिल्कुल सही संतुलित प्रोटीन' }
  },
  chicken: {
    key: 'chicken', labelEn: 'Chicken', labelHi: 'चिकन', tags: ['protein', 'low_carb'],
    pcosNote: { en: 'High quality lean protein', hi: 'उच्च गुणवत्ता वाला लीन प्रोटीन' }
  },
  fish: {
    key: 'fish', labelEn: 'Fish', labelHi: 'मछली', tags: ['protein', 'healthy_fat', 'anti_inflammatory'],
    pcosNote: { en: 'Rich in Omega-3 for inflammation', hi: 'सूजन के लिए ओमेगा -3 से भरपूर' }
  },
  roti: {
    key: 'roti', labelEn: 'Roti', labelHi: 'रोटी', tags: ['moderate_carb', 'fiber'],
    pcosNote: { en: 'Pair with protein and fat', hi: 'प्रोटीन और वसा के साथ जोड़ें' }
  },
  rice: {
    key: 'rice', labelEn: 'Rice', labelHi: 'चावल', tags: ['high_carb'],
    pcosNote: { en: 'Eat with lots of dal or veggies', hi: 'खूब सारी दाल या सब्जियों के साथ खाएं' }
  },
  paratha: {
    key: 'paratha', labelEn: 'Paratha', labelHi: 'पराठा', tags: ['moderate_carb', 'healthy_fat'],
    pcosNote: { en: 'A heavy breakfast option', hi: 'एक भारी नाश्ता विकल्प' }
  },
  oats: {
    key: 'oats', labelEn: 'Oats', labelHi: 'ओट्स', tags: ['moderate_carb', 'fiber'],
    pcosNote: { en: 'Good source of soluble fiber', hi: 'घुलनशील फाइबर का अच्छा स्रोत' }
  },
  poha: {
    key: 'poha', labelEn: 'Poha', labelHi: 'पोहा', tags: ['high_carb'],
    pcosNote: { en: 'Add peanuts for protein', hi: 'प्रोटीन के लिए मूंगफली डालें' }
  },
  idli: {
    key: 'idli', labelEn: 'Idli', labelHi: 'इडली', tags: ['moderate_carb', 'fermented'],
    pcosNote: { en: 'Fermented carbs are easier to digest', hi: 'किण्वित कार्ब्स पचाने में आसान होते हैं' }
  },
  dosa: {
    key: 'dosa', labelEn: 'Dosa', labelHi: 'डोसा', tags: ['moderate_carb', 'fermented'],
    pcosNote: { en: 'Great fermented option', hi: 'बढ़िया किण्वित विकल्प' }
  },
  sprouts: {
    key: 'sprouts', labelEn: 'Sprouts', labelHi: 'अंकुरित अनाज', tags: ['protein', 'fiber', 'low_carb'],
    pcosNote: { en: 'Nutrient dense and high in fiber', hi: 'पोषक तत्वों से भरपूर और उच्च फाइबर' }
  },
  salad: {
    key: 'salad', labelEn: 'Salad', labelHi: 'सलाद', tags: ['fiber', 'low_carb'],
    pcosNote: { en: 'Great for adding volume and fiber', hi: 'मात्रा और फाइबर जोड़ने के लिए बढ़िया' }
  },
  sabzi: {
    key: 'sabzi', labelEn: 'Sabzi', labelHi: 'सब्जी', tags: ['fiber', 'low_carb'],
    pcosNote: { en: 'Packed with vitamins', hi: 'विटामिन से भरपूर' }
  },
  fruit: {
    key: 'fruit', labelEn: 'Fruit', labelHi: 'फल', tags: ['moderate_carb', 'fiber'],
    pcosNote: { en: 'Pair with nuts for blood sugar balance', hi: 'ब्लड शुगर संतुलन के लिए मेवों के साथ जोड़ें' }
  },
  nuts_seeds: {
    key: 'nuts_seeds', labelEn: 'Nuts & Seeds', labelHi: 'मेवे और बीज', tags: ['healthy_fat', 'protein', 'fiber'],
    pcosNote: { en: 'Excellent snack for PCOS', hi: 'PCOS के लिए बेहतरीन स्नैक' }
  },
  ghee: {
    key: 'ghee', labelEn: 'Ghee', labelHi: 'घी', tags: ['healthy_fat'],
    pcosNote: { en: 'Good fat for hormone synthesis', hi: 'हार्मोन संश्लेषण के लिए अच्छा वसा' }
  },
  olive_oil: {
    key: 'olive_oil', labelEn: 'Olive Oil', labelHi: 'जैतून का तेल', tags: ['healthy_fat', 'anti_inflammatory'],
    pcosNote: { en: 'Anti-inflammatory healthy fat', hi: 'सूजन-रोधी स्वस्थ वसा' }
  },
  coconut: {
    key: 'coconut', labelEn: 'Coconut', labelHi: 'नारियल', tags: ['healthy_fat'],
    pcosNote: { en: 'Rich in medium-chain triglycerides', hi: 'मध्यम-श्रृंखला ट्राइग्लिसराइड्स से भरपूर' }
  },
  avocado: {
    key: 'avocado', labelEn: 'Avocado', labelHi: 'एवोकैडो', tags: ['healthy_fat', 'fiber'],
    pcosNote: { en: 'Great for insulin resistance', hi: 'इंसुलिन प्रतिरोध के लिए बढ़िया' }
  },
  sweet_potato: {
    key: 'sweet_potato', labelEn: 'Sweet Potato', labelHi: 'शकरकंद', tags: ['moderate_carb', 'fiber'],
    pcosNote: { en: 'Lower glycemic index carb', hi: 'कम ग्लाइसेमिक इंडेक्स वाला कार्ब' }
  },
  chai_no_sugar: {
    key: 'chai_no_sugar', labelEn: 'Chai (No Sugar)', labelHi: 'चाय (बिना चीनी)', tags: ['low_carb'],
    pcosNote: { en: 'Enjoy without added sugar', hi: 'बिना चीनी मिलाए आनंद लें' }
  },
  green_tea: {
    key: 'green_tea', labelEn: 'Green Tea', labelHi: 'ग्रीन टी', tags: ['low_carb', 'anti_inflammatory'],
    pcosNote: { en: 'Good for metabolism', hi: 'चयापचय के लिए अच्छा' }
  },
  spearmint_tea: {
    key: 'spearmint_tea', labelEn: 'Spearmint Tea', labelHi: 'स्पीयरमिंट चाय', tags: ['low_carb', 'anti_inflammatory'],
    pcosNote: { en: 'Helps reduce androgens naturally', hi: 'एण्ड्रोजन को स्वाभाविक रूप से कम करने में मदद करता है' }
  },
  turmeric_milk: {
    key: 'turmeric_milk', labelEn: 'Turmeric Milk', labelHi: 'हल्दी वाला दूध', tags: ['anti_inflammatory', 'protein'],
    pcosNote: { en: 'Great for reducing inflammation', hi: 'सूजन को कम करने के लिए बढ़िया' }
  },
  smoothie: {
    key: 'smoothie', labelEn: 'Smoothie', labelHi: 'स्मूथी', tags: ['moderate_carb'],
    pcosNote: { en: 'Add protein powder for balance', hi: 'संतुलन के लिए प्रोटीन पाउडर मिलाएं' }
  },
  makhana: {
    key: 'makhana', labelEn: 'Makhana', labelHi: 'मखाना', tags: ['moderate_carb', 'fiber'],
    pcosNote: { en: 'A great low glycemic snack', hi: 'एक बेहतरीन कम ग्लाइसेमिक स्नैक' }
  },
  rajma: {
    key: 'rajma', labelEn: 'Rajma', labelHi: 'राजमा', tags: ['protein', 'moderate_carb', 'fiber'],
    pcosNote: { en: 'High in fiber and plant protein', hi: 'फाइबर और प्लांट प्रोटीन से भरपूर' }
  },
  chana: {
    key: 'chana', labelEn: 'Chana', labelHi: 'चना', tags: ['protein', 'moderate_carb', 'fiber'],
    pcosNote: { en: 'Excellent for insulin resistance', hi: 'इंसुलिन प्रतिरोध के लिए उत्कृष्ट' }
  }
};
