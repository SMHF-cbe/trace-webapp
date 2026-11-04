import { useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { ready, isAdmin, logout } = useAdminAuth();

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  if (!ready || !isAdmin) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const row = (label: string, sub: string, path: string) => (
    <TouchableOpacity
      onPress={() => router.push(path)}
      style={[screenStyles.card, { marginBottom: 12, padding: 18 }]}
      accessibilityRole="button"
    >
      <Text style={{ color: COLORS.textPrimary, fontSize: 17, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: COLORS.textSecondary, marginTop: 6, fontSize: 14, lineHeight: 20 }}>{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen scroll edges={["top", "right", "left", "bottom"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={() => router.replace("/")} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Home</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>Admin</Text>
        <Text style={[screenStyles.subtitle, { marginBottom: 16 }]}>Manage routes and store data.</Text>

        {row("Routes", "Create, rename, change passwords, or delete routes (and their stores).", "/admin-routes")}
        {row("Create route", "Create route and import stores in one flow from the same screen.", "/admin")}
        {row("Reports", "Master report: filter by route and date range, then export PDF/CSV.", "/admin-reports")}
        {row("Edit sales entries", "Search and correct wrong entries — edit delivered, returned, payments, or delete.", "/admin-edit-entry")}

        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace("/");
          }}
          style={[screenStyles.secondaryBtn, { marginTop: 8 }]}
        >
          <Text style={screenStyles.secondaryBtnText}>Sign out admin</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
