import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

type Language = "en" | "ta" | "hi" | "as";

type InstructionCardData = {
  title: string;
  lines: string[];
};

type LanguageContent = {
  label: string;
  noticeTitle: string;
  notice: string;
  cards: InstructionCardData[];
  footerTitle: string;
  checks: string[];
};

const CONTENT: Record<Language, LanguageContent> = {
  en: {
    label: "English",
    noticeTitle: "Important",
    notice:
      "Enter the visit immediately and check the numbers before saving. Contact the admin when an entry needs correction after the editing window closes.",
    cards: [
      {
        title: "1. Open Staff and choose your route",
        lines: [
          "Tap Staff on the home screen. Tap the information icon (ⓘ) any time to read these instructions.",
          "Select your route from the list. Enter the route password when asked. Do not share the password with another route.",
        ],
      },
      {
        title: "2. Open the store and start a visit",
        lines: [
          "Tap the store name in your route list. Review the store information, price, offer, and outstanding balance before entering numbers.",
          "A normal visit starts with Open. Choose Closed only when the shop had no sale today.",
        ],
      },
      {
        title: "3. Sales and delivered units",
        lines: [
          "Sales means packets delivered to the store for sale. Enter that quantity in Units delivered.",
          "Example: If you deliver 10 packets to the shop, enter 10 in Units delivered. Record the amount collected for this visit in Cash collected or UPI collected.",
        ],
      },
      {
        title: "4. Returns and damaged packets",
        lines: [
          "A return is a packet taken back from the store because it is damaged or needs replacement. It is not a sale.",
          "If a damaged packet is returned and replaced, record the returned/replaced packet in Units returned. Do not add the returned packet to Units delivered.",
        ],
      },
      {
        title: "5. Cash and UPI payment",
        lines: [
          "Enter cash in Cash collected. For UPI, turn on UPI received only after the payment is visible in the account, then enter the UPI amount.",
          "Do not enter the same payment in both cash and UPI. Check the total collected before saving.",
        ],
      },
      {
        title: "6. Save and edit within 15 minutes",
        lines: [
          "Tap Save new visit after checking the figures. To make another delivery later the same day, save the first visit and tap New visit.",
          "A saved entry can be edited for 15 minutes after it is created. The screen shows the remaining time beside the visit.",
          "After 15 minutes, the entry is locked. Contact the admin and tell them the route, store, entry time, and exact correction needed. Do not create a second entry just to correct the old one.",
        ],
      },
    ],
    footerTitle: "Quick check before Save",
    checks: [
      "✓ Delivered = packets given to the store",
      "✓ Returned = damaged/replaced packets taken back",
      "✓ Payment entered only once",
      "✓ Route, store, quantity, and amount are correct",
    ],
  },
  ta: {
    label: "தமிழ்",
    noticeTitle: "முக்கியம்",
    notice:
      "வருகை விவரங்களை உடனே பதிவு செய்து, சேமிப்பதற்கு முன் எண்களை சரிபார்க்கவும். திருத்த நேரம் முடிந்த பிறகு மாற்றம் தேவைப்பட்டால் நிர்வாகியைத் தொடர்பு கொள்ளவும்.",
    cards: [
      {
        title: "1. Staff-ஐ திறந்து உங்கள் வழித்தடத்தைத் தேர்வு செய்யவும்",
        lines: [
          "முகப்புத் திரையில் Staff என்பதைத் தட்டவும். இந்த வழிமுறைகளைப் படிக்க தகவல் குறியீட்டை (ⓘ) எப்போது வேண்டுமானாலும் தட்டலாம்.",
          "பட்டியலில் உங்கள் வழித்தடத்தைத் தேர்வு செய்யவும். கேட்கப்படும் போது அந்த வழித்தடத்தின் கடவுச்சொல்லை உள்ளிடவும். கடவுச்சொல்லை வேறு வழித்தடத்துடன் பகிர வேண்டாம்.",
        ],
      },
      {
        title: "2. கடையைத் திறந்து வருகையைத் தொடங்கவும்",
        lines: [
          "உங்கள் வழித்தடப் பட்டியலில் கடையின் பெயரைத் தட்டவும். எண்களைப் பதிவு செய்வதற்கு முன் கடை விவரம், விலை, சலுகை மற்றும் நிலுவைத் தொகையைச் சரிபார்க்கவும்.",
          "சாதாரண வருகைக்கு Open என்பதைத் தேர்வு செய்யவும். இன்று கடையில் விற்பனை எதுவும் இல்லாதபோது மட்டும் Closed என்பதைத் தேர்வு செய்யவும்.",
        ],
      },
      {
        title: "3. விற்பனை மற்றும் வழங்கப்பட்ட எண்ணிக்கை",
        lines: [
          "Sales என்பது கடையில் விற்பனைக்காக வழங்கப்படும் பாக்கெட்டுகள். அந்த எண்ணிக்கையை Units delivered பகுதியில் உள்ளிடவும்.",
          "உதாரணம்: கடைக்கு 10 பாக்கெட்டுகள் வழங்கினால் Units delivered பகுதியில் 10 என உள்ளிடவும். இந்த வருகைக்கான வசூலை Cash collected அல்லது UPI collected பகுதியில் பதிவு செய்யவும்.",
        ],
      },
      {
        title: "4. திரும்பப் பெறுதல் மற்றும் சேதமான பாக்கெட்டுகள்",
        lines: [
          "Return என்பது சேதமடைந்த அல்லது மாற்ற வேண்டிய பாக்கெட்டை கடையிலிருந்து திரும்பப் பெறுவது. இது விற்பனை அல்ல.",
          "சேதமான பாக்கெட்டை திரும்பப் பெற்று மாற்றுப் பாக்கெட் கொடுத்தால், அந்த பாக்கெட்டை Units returned பகுதியில் பதிவு செய்யவும். திரும்பப் பெற்ற பாக்கெட்டை Units delivered பகுதியில் சேர்க்க வேண்டாம்.",
        ],
      },
      {
        title: "5. ரொக்கம் மற்றும் UPI பணம்",
        lines: [
          "ரொக்கத்தை Cash collected பகுதியில் உள்ளிடவும். UPI பணம் கணக்கில் வந்தது உறுதியான பிறகு மட்டும் UPI received-ஐ இயக்கி, UPI தொகையை உள்ளிடவும்.",
          "ஒரே பணத்தை Cash மற்றும் UPI இரண்டிலும் பதிவு செய்ய வேண்டாம். சேமிப்பதற்கு முன் மொத்த வசூலைச் சரிபார்க்கவும்.",
        ],
      },
      {
        title: "6. சேமித்தல் மற்றும் 15 நிமிடங்களுக்குள் திருத்துதல்",
        lines: [
          "எண்களைச் சரிபார்த்த பிறகு Save new visit என்பதைத் தட்டவும். அதே நாளில் மீண்டும் விநியோகம் செய்தால், முதல் வருகையைச் சேமித்து New visit என்பதைத் தட்டவும்.",
          "சேமிக்கப்பட்ட பதிவை உருவாக்கிய நேரத்திலிருந்து 15 நிமிடங்களுக்குள் திருத்தலாம். அந்த வருகையின் அருகில் மீதமுள்ள நேரம் காட்டப்படும்.",
          "15 நிமிடங்களுக்குப் பிறகு பதிவு பூட்டப்படும். அப்போது வழித்தடம், கடை, பதிவு நேரம் மற்றும் செய்ய வேண்டிய சரியான திருத்தத்தை நிர்வாகியிடம் தெரிவிக்கவும். பழைய பதிவைத் திருத்துவதற்காக புதிய பதிவை உருவாக்க வேண்டாம்.",
        ],
      },
    ],
    footerTitle: "சேமிப்பதற்கு முன் சரிபார்ப்பு",
    checks: [
      "✓ Delivered = கடைக்கு வழங்கிய பாக்கெட்டுகள்",
      "✓ Returned = திரும்பப் பெற்ற சேதமான/மாற்றுப் பாக்கெட்டுகள்",
      "✓ பணம் ஒருமுறை மட்டும் பதிவு செய்யப்பட்டது",
      "✓ வழித்தடம், கடை, எண்ணிக்கை, தொகை சரியாக உள்ளன",
    ],
  },
  hi: {
    label: "हिंदी",
    noticeTitle: "महत्वपूर्ण",
    notice:
      "भेंट का विवरण तुरंत दर्ज करें और सेव करने से पहले सभी संख्याएँ जाँच लें। एडिट करने का समय समाप्त होने के बाद सुधार चाहिए तो एडमिन से संपर्क करें।",
    cards: [
      {
        title: "1. Staff खोलें और अपना रूट चुनें",
        lines: [
          "होम स्क्रीन पर Staff पर टैप करें। इन निर्देशों को पढ़ने के लिए कभी भी सूचना आइकन (ⓘ) पर टैप कर सकते हैं।",
          "सूची में अपना रूट चुनें। पूछे जाने पर रूट का पासवर्ड डालें। पासवर्ड किसी दूसरे रूट के साथ साझा न करें।",
        ],
      },
      {
        title: "2. स्टोर खोलें और भेंट शुरू करें",
        lines: [
          "अपने रूट की सूची में स्टोर के नाम पर टैप करें। संख्या भरने से पहले स्टोर की जानकारी, कीमत, ऑफर और बकाया राशि जाँच लें।",
          "सामान्य भेंट के लिए Open चुनें। आज स्टोर में कोई बिक्री न हुई हो तभी Closed चुनें।",
        ],
      },
      {
        title: "3. बिक्री और दिए गए पैकेट",
        lines: [
          "Sales का अर्थ है स्टोर को बिक्री के लिए दिए गए पैकेट। यह संख्या Units delivered में दर्ज करें।",
          "उदाहरण: यदि स्टोर को 10 पैकेट दिए हैं, तो Units delivered में 10 डालें। इस भेंट की वसूली Cash collected या UPI collected में दर्ज करें।",
        ],
      },
      {
        title: "4. वापसी और खराब पैकेट",
        lines: [
          "Return का अर्थ है खराब या बदलने योग्य पैकेट को स्टोर से वापस लेना। यह बिक्री नहीं है।",
          "खराब पैकेट वापस लेकर नया पैकेट देने पर उसे Units returned में दर्ज करें। वापस लिए गए पैकेट को Units delivered में न जोड़ें।",
        ],
      },
      {
        title: "5. नकद और UPI भुगतान",
        lines: [
          "नकद राशि Cash collected में डालें। UPI भुगतान खाते में दिखाई देने के बाद ही UPI received चालू करें और UPI राशि भरें।",
          "एक ही भुगतान को Cash और UPI दोनों में दर्ज न करें। सेव करने से पहले कुल वसूली जाँच लें।",
        ],
      },
      {
        title: "6. सेव करें और 15 मिनट में सुधार करें",
        lines: [
          "आँकड़े जाँचने के बाद Save new visit दबाएँ। उसी दिन फिर से डिलीवरी हो तो पहली भेंट सेव करके New visit दबाएँ।",
          "सेव की गई एंट्री बनने के 15 मिनट तक एडिट की जा सकती है। भेंट के पास बचा हुआ समय दिखाई देगा।",
          "15 मिनट बाद एंट्री लॉक हो जाएगी। रूट, स्टोर, एंट्री का समय और सही सुधार बताकर एडमिन से संपर्क करें। पुरानी एंट्री सुधारने के लिए दूसरी एंट्री न बनाएँ।",
        ],
      },
    ],
    footerTitle: "सेव करने से पहले जाँच",
    checks: [
      "✓ Delivered = स्टोर को दिए गए पैकेट",
      "✓ Returned = वापस लिए गए खराब/बदले हुए पैकेट",
      "✓ भुगतान केवल एक बार दर्ज किया गया",
      "✓ रूट, स्टोर, मात्रा और राशि सही हैं",
    ],
  },
  as: {
    label: "অসমীয়া",
    noticeTitle: "গুৰুত্বপূৰ্ণ",
    notice:
      "ভ্ৰমণৰ তথ্য তৎক্ষণাত লিখক আৰু সংৰক্ষণ কৰাৰ আগতে সংখ্যাবোৰ পৰীক্ষা কৰক। সম্পাদনাৰ সময় শেষ হোৱাৰ পিছত সংশোধনৰ প্ৰয়োজন হ’লে প্ৰশাসকৰ সৈতে যোগাযোগ কৰক।",
    cards: [
      {
        title: "১. Staff খোলক আৰু আপোনাৰ ৰুট বাছনি কৰক",
        lines: [
          "হোম স্ক্ৰীনত Staff টিপক। এই নিৰ্দেশনাবোৰ পঢ়িবলৈ যিকোনো সময়তে তথ্য চিহ্ন (ⓘ) টিপিব পাৰে।",
          "তালিকাৰ পৰা আপোনাৰ ৰুট বাছনি কৰক। সোধা হ’লে ৰুটৰ পাছৱৰ্ড দিয়ক। পাছৱৰ্ড আন ৰুটৰ সৈতে ভাগ নকৰিব।",
        ],
      },
      {
        title: "২. দোকান খোলক আৰু ভ্ৰমণ আৰম্ভ কৰক",
        lines: [
          "আপোনাৰ ৰুটৰ তালিকাত দোকানৰ নাম টিপক। সংখ্যা দিয়াৰ আগতে দোকানৰ তথ্য, দাম, অফাৰ আৰু বাকী ধন পৰীক্ষা কৰক।",
          "সাধাৰণ ভ্ৰমণৰ বাবে Open বাছনি কৰক। আজি দোকানত কোনো বিক্ৰী নোহোৱাতহে Closed বাছনি কৰক।",
        ],
      },
      {
        title: "৩. বিক্ৰী আৰু দিয়া পেকেট",
        lines: [
          "Sales মানে দোকানত বিক্ৰীৰ বাবে দিয়া পেকেট। সেই সংখ্যা Units delivered ত লিখক।",
          "উদাহৰণ: দোকানক ১০টা পেকেট দিলে Units delivered ত ১০ লিখক। এই ভ্ৰমণৰ সংগ্ৰহ Cash collected বা UPI collected ত লিখক।",
        ],
      },
      {
        title: "৪. ঘূৰাই লোৱা আৰু নষ্ট পেকেট",
        lines: [
          "Return মানে নষ্ট বা সলনি কৰিবলগীয়া পেকেট দোকানৰ পৰা ঘূৰাই লোৱা। এইটো বিক্ৰী নহয়।",
          "নষ্ট পেকেট ঘূৰাই লৈ নতুন পেকেট দিলে ঘূৰাই লোৱা পেকেটটো Units returned ত লিখক। ঘূৰাই লোৱা পেকেট Units delivered ত যোগ নকৰিব।",
        ],
      },
      {
        title: "৫. নগদ আৰু UPI পেমেণ্ট",
        lines: [
          "নগদ ধন Cash collected ত লিখক। UPI ধন একাউণ্টত দেখা দিয়াৰ পিছতহে UPI received চালু কৰি UPI ধনৰাশি লিখক।",
          "একে পেমেণ্ট Cash আৰু UPI দুয়োটাতে লিখিব নালাগে। সংৰক্ষণ কৰাৰ আগতে মুঠ সংগ্ৰহ পৰীক্ষা কৰক।",
        ],
      },
      {
        title: "৬. সংৰক্ষণ আৰু ১৫ মিনিটৰ ভিতৰত সম্পাদনা",
        lines: [
          "সংখ্যাবোৰ পৰীক্ষা কৰি Save new visit টিপক। একেদিনাই পুনৰ ডেলিভাৰী কৰিলে প্ৰথম ভ্ৰমণ সংৰক্ষণ কৰি New visit টিপক।",
          "সংৰক্ষিত এণ্ট্ৰী সৃষ্টি কৰাৰ পিছত ১৫ মিনিটলৈ সম্পাদনা কৰিব পাৰি। ভ্ৰমণৰ কাষত বাকী থকা সময় দেখা যাব।",
          "১৫ মিনিটৰ পিছত এণ্ট্ৰী লক হ’ব। ৰুট, দোকান, এণ্ট্ৰীৰ সময় আৰু সঠিক সংশোধন জনাই প্ৰশাসকৰ সৈতে যোগাযোগ কৰক। পুৰণি এণ্ট্ৰী সংশোধন কৰিবলৈ দ্বিতীয় এণ্ট্ৰী নকৰিব।",
        ],
      },
    ],
    footerTitle: "সংৰক্ষণ কৰাৰ আগতে পৰীক্ষা",
    checks: [
      "✓ Delivered = দোকানক দিয়া পেকেট",
      "✓ Returned = ঘূৰাই লোৱা নষ্ট/সলনি কৰা পেকেট",
      "✓ পেমেণ্ট কেৱল এবাৰ লিখা হৈছে",
      "✓ ৰুট, দোকান, পৰিমাণ আৰু ধনৰাশি সঠিক",
    ],
  },
};

function InstructionCard({ card }: { card: InstructionCardData }) {
  return (
    <View style={screenStyles.card}>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <View style={styles.divider} />
      {card.lines.map((line, index) => (
        <Text key={`${card.title}-${index}`} style={styles.bodyText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export default function InstructionsScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const content = CONTENT[language];

  return (
    <Screen edges={["top", "right", "left", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Back to routes</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>Staff instructions</Text>
        <Text style={screenStyles.subtitle}>How to record a store visit correctly</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languageRow}
          accessibilityLabel="Choose instruction language"
        >
          {(Object.keys(CONTENT) as Language[]).map((key) => {
            const selected = key === language;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setLanguage(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Show instructions in ${CONTENT[key].label}`}
                style={[styles.languageButton, selected && styles.languageButtonSelected]}
              >
                <Text style={[styles.languageText, selected && styles.languageTextSelected]}>
                  {CONTENT[key].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{content.noticeTitle}</Text>
          <Text style={styles.noticeText}>{content.notice}</Text>
        </View>

        {content.cards.map((card) => (
          <InstructionCard key={card.title} card={card} />
        ))}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>{content.footerTitle}</Text>
          {content.checks.map((check) => (
            <Text key={check} style={styles.checkText}>
              {check}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  languageRow: {
    paddingVertical: 12,
    gap: 8,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  languageButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  languageTextSelected: {
    color: "#FFFFFF",
  },
  notice: {
    backgroundColor: "rgba(46, 204, 113, 0.12)",
    borderColor: "rgba(46, 204, 113, 0.4)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  noticeTitle: {
    color: COLORS.primary,
    fontWeight: "800" as const,
    fontSize: 16,
    marginBottom: 8,
  },
  noticeText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 23,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800" as const,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  bodyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 7,
  },
  footerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  footerTitle: {
    color: COLORS.primary,
    fontWeight: "800" as const,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  checkText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 2,
  },
};
