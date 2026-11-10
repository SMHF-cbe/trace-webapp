import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

function InstructionCard({
  title,
  tamilTitle,
  english,
  tamil,
}: {
  title: string;
  tamilTitle: string;
  english: string[];
  tamil: string[];
}) {
  return (
    <View style={screenStyles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.tamilTitle}>{tamilTitle}</Text>
      {english.map((line, index) => (
        <Text key={`en-${index}`} style={styles.englishText}>
          {line}
        </Text>
      ))}
      <View style={styles.divider} />
      {tamil.map((line, index) => (
        <Text key={`ta-${index}`} style={styles.tamilText}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export default function InstructionsScreen() {
  const router = useRouter();

  return (
    <Screen edges={["top", "right", "left", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Back to routes</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>Staff instructions</Text>
        <Text style={screenStyles.subtitle}>How to record a store visit correctly</Text>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Important / முக்கியம்</Text>
          <Text style={styles.noticeText}>
            Enter the visit immediately and check the numbers before saving. Contact the admin when an entry needs correction after the editing window closes.
          </Text>
          <Text style={styles.noticeTamil}>
            வருகை விவரங்களை உடனே பதிவு செய்து, சேமிப்பதற்கு முன் எண்களை சரிபார்க்கவும். திருத்த நேரம் முடிந்த பிறகு மாற்றம் தேவைப்பட்டால் நிர்வாகியைத் தொடர்பு கொள்ளவும்.
          </Text>
        </View>

        <InstructionCard
          title="1. Open Staff and choose your route"
          tamilTitle="1. Staff-ஐ திறந்து உங்கள் வழித்தடத்தைத் தேர்வு செய்யவும்"
          english={[
            "Tap Staff on the home screen. Tap the information icon (ⓘ) any time to read these instructions.",
            "Select your route from the list. Enter the route password when asked. Do not share the password with another route.",
          ]}
          tamil={[
            "முகப்புத் திரையில் Staff என்பதைத் தட்டவும். இந்த வழிமுறைகளைப் படிக்க மேலே உள்ள தகவல் குறியீட்டை (ⓘ) எப்போது வேண்டுமானாலும் தட்டலாம்.",
            "பட்டியலில் உங்கள் வழித்தடத்தைத் தேர்வு செய்யவும். கேட்கப்படும் போது அந்த வழித்தடத்தின் கடவுச்சொல்லை உள்ளிடவும். கடவுச்சொல்லை வேறு வழித்தடத்துடன் பகிர வேண்டாம்.",
          ]}
        />

        <InstructionCard
          title="2. Open the store and start a visit"
          tamilTitle="2. கடையைத் திறந்து வருகையைத் தொடங்கவும்"
          english={[
            "Tap the store name in your route list. Review the store information, price, offer, and outstanding balance before entering numbers.",
            "A normal visit starts with Open. Choose Closed only when the shop had no sale today.",
          ]}
          tamil={[
            "உங்கள் வழித்தடப் பட்டியலில் கடையின் பெயரைத் தட்டவும். எண்களைப் பதிவு செய்வதற்கு முன் கடை விவரம், விலை, சலுகை மற்றும் நிலுவைத் தொகையைச் சரிபார்க்கவும்.",
            "சாதாரண வருகைக்கு Open என்பதைத் தேர்வு செய்யவும். இன்று கடையில் விற்பனை எதுவும் இல்லாதபோது மட்டும் Closed என்பதைத் தேர்வு செய்யவும்.",
          ]}
        />

        <InstructionCard
          title="3. Sales and delivered units"
          tamilTitle="3. விற்பனை மற்றும் வழங்கப்பட்ட எண்ணிக்கை"
          english={[
            "Sales means packets delivered to the store for sale. Enter that quantity in Units delivered.",
            "Example: If you deliver 10 packets to the shop, enter 10 in Units delivered. Record the amount collected for this visit in Cash collected or UPI collected.",
          ]}
          tamil={[
            "Sales என்பது கடையில் விற்பனைக்காக வழங்கப்படும் பாக்கெட்டுகள். அந்த எண்ணிக்கையை Units delivered பகுதியில் உள்ளிடவும்.",
            "உதாரணம்: கடைக்கு 10 பாக்கெட்டுகள் வழங்கினால் Units delivered பகுதியில் 10 என உள்ளிடவும். இந்த வருகைக்கான வசூலை Cash collected அல்லது UPI collected பகுதியில் பதிவு செய்யவும்.",
          ]}
        />

        <InstructionCard
          title="4. Returns and damaged packets"
          tamilTitle="4. திரும்பப் பெறுதல் மற்றும் சேதமான பாக்கெட்டுகள்"
          english={[
            "A return is a packet taken back from the store because it is damaged or needs replacement. It is not a sale.",
            "If a damaged packet is returned and replaced, record the returned/replaced packet in Units returned. Do not add the returned packet to Units delivered.",
          ]}
          tamil={[
            "Return என்பது சேதமடைந்த அல்லது மாற்ற வேண்டிய பாக்கெட்டை கடையிலிருந்து திரும்பப் பெறுவது. இது விற்பனை அல்ல.",
            "சேதமான பாக்கெட்டை திரும்பப் பெற்று மாற்றுப் பாக்கெட் கொடுத்தால், திரும்பப் பெறப்பட்ட/மாற்றப்பட்ட பாக்கெட்டை Units returned பகுதியில் பதிவு செய்யவும். திரும்பப் பெற்ற பாக்கெட்டை Units delivered பகுதியில் சேர்க்க வேண்டாம்.",
          ]}
        />

        <InstructionCard
          title="5. Cash and UPI payment"
          tamilTitle="5. ரொக்கம் மற்றும் UPI பணம்"
          english={[
            "Enter cash in Cash collected. For UPI, turn on UPI received only after the payment is visible in the account, then enter the UPI amount.",
            "Do not enter the same payment in both cash and UPI. Check the total collected before saving.",
          ]}
          tamil={[
            "ரொக்கத்தை Cash collected பகுதியில் உள்ளிடவும். UPI பணம் கணக்கில் வந்தது உறுதியான பிறகு மட்டும் UPI received-ஐ இயக்கி, UPI தொகையை உள்ளிடவும்.",
            "ஒரே பணத்தை Cash மற்றும் UPI இரண்டிலும் பதிவு செய்ய வேண்டாம். சேமிப்பதற்கு முன் மொத்த வசூலைச் சரிபார்க்கவும்.",
          ]}
        />

        <InstructionCard
          title="6. Save and edit within 15 minutes"
          tamilTitle="6. சேமித்தல் மற்றும் 15 நிமிடங்களுக்குள் திருத்துதல்"
          english={[
            "Tap Save new visit after checking the figures. To make another delivery later the same day, save the first visit and tap New visit.",
            "A saved entry can be edited for 15 minutes after it is created. The screen shows the remaining time beside the visit.",
            "After 15 minutes, the entry is locked. Contact the admin and tell them the route, store, entry time, and exact correction needed. Do not create a second entry just to correct the old one.",
          ]}
          tamil={[
            "எண்களைச் சரிபார்த்த பிறகு Save new visit என்பதைத் தட்டவும். அதே நாளில் மீண்டும் விநியோகம் செய்தால், முதல் வருகையைச் சேமித்து New visit என்பதைத் தட்டவும்.",
            "சேமிக்கப்பட்ட பதிவை உருவாக்கிய நேரத்திலிருந்து 15 நிமிடங்களுக்குள் திருத்தலாம். அந்த வருகையின் அருகில் மீதமுள்ள நேரம் காட்டப்படும்.",
            "15 நிமிடங்களுக்குப் பிறகு பதிவு பூட்டப்படும். அப்போது வழித்தடம், கடை, பதிவு நேரம் மற்றும் செய்ய வேண்டிய சரியான திருத்தத்தை நிர்வாகியிடம் தெரிவிக்கவும். பழைய பதிவைத் திருத்துவதற்காக புதிய பதிவை உருவாக்க வேண்டாம்.",
          ]}
        />

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Quick check before Save / சேமிப்பதற்கு முன் சரிபார்ப்பு</Text>
          <Text style={styles.checkText}>✓ Delivered = packets given to the store</Text>
          <Text style={styles.checkText}>✓ Returned = damaged/replaced packets taken back</Text>
          <Text style={styles.checkText}>✓ Payment entered only once</Text>
          <Text style={styles.checkText}>✓ Route, store, quantity, and amount are correct</Text>
          <Text style={styles.checkTamil}>✓ Delivered = கடைக்கு வழங்கிய பாக்கெட்டுகள்</Text>
          <Text style={styles.checkTamil}>✓ Returned = திரும்பப் பெற்ற சேதமான/மாற்றுப் பாக்கெட்டுகள்</Text>
          <Text style={styles.checkTamil}>✓ பணம் ஒருமுறை மட்டும் பதிவு செய்யப்பட்டது</Text>
          <Text style={styles.checkTamil}>✓ வழித்தடம், கடை, எண்ணிக்கை, தொகை சரியாக உள்ளன</Text>
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
    lineHeight: 21,
  },
  noticeTamil: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800" as const,
    lineHeight: 22,
  },
  tamilTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginTop: 3,
    marginBottom: 10,
  },
  englishText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 7,
  },
  tamilText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 7,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
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
    lineHeight: 21,
  },
  checkTamil: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 2,
  },
};
