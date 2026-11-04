import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const { ready, isAdmin } = useAdminAuth();

  if (!ready) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "right", "left", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, justifyContent: "center" }}>
        <Text style={[screenStyles.title, { fontSize: 28, textAlign: "center", marginBottom: 8 }]}>route_sync</Text>
        <Text style={[screenStyles.subtitle, { textAlign: "center", marginBottom: 40 }]}>
          Delivery routes and collections. Choose how you want to continue.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/staff")}
          style={[screenStyles.primaryBtn, { marginBottom: 14 }]}
          accessibilityRole="button"
          accessibilityLabel="Continue as staff"
        >
          <Text style={screenStyles.primaryBtnText}>Staff — pick a route</Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.textDisabled, fontSize: 13, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
          No account needed. You will sign in with your route password after choosing a route.
        </Text>

        <TouchableOpacity
          onPress={() => router.push(isAdmin ? "/admin-dashboard" : "/admin-login")}
          style={[screenStyles.secondaryBtn, { marginBottom: 8 }]}
          accessibilityRole="button"
          accessibilityLabel="Admin sign in"
        >
          <Text style={screenStyles.secondaryBtnText}>
            {isAdmin ? "Admin — open dashboard" : "Admin — password only"}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.textDisabled, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
          Same password as server ADMIN_SECRET. Manage routes, import stores, and delete data.
        </Text>
      </View>
    </Screen>
  );
}
