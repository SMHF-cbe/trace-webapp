import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { useRouter } from "expo-router";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";

export default function ImportScreen() {
  const router = useRouter();
  const { adminSecret, isAdmin, ready } = useAdminAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    if (result.canceled) return;

    const file = result.assets[0];

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } as any);

    if (!adminSecret) {
      Alert.alert("Admin required", "Sign in as admin to import stores.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/import/stores`, {
        method: "POST",
        headers: adminSecretHeaders(adminSecret),
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (res.status === 200) {
        Alert.alert("Import complete", typeof json.message === "string" ? json.message : "Stores imported.");
        router.replace("/admin-dashboard");
      } else {
        Alert.alert("Import failed", typeof json.detail === "string" ? json.detail : "Check the file format and columns.");
      }
    } catch {
      Alert.alert("Error", "Cannot reach the server. Check EXPO_PUBLIC_API_URL and Wi‑Fi.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready || !isAdmin) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.replace("/admin-dashboard")} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Admin</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Import stores</Text>
      <Text style={screenStyles.subtitle}>
        Required: <Text style={{ fontWeight: "700" }}>name</Text>, <Text style={{ fontWeight: "700" }}>price</Text>.{" "}
        <Text style={{ fontWeight: "700" }}>route_id</Text> is the business route ID (same as in admin, e.g.{" "}
        <Text style={{ fontWeight: "700" }}>1</Text>). You can omit <Text style={{ fontWeight: "700" }}>route_id</Text> if
        the file is named like <Text style={{ fontWeight: "700" }}>Route 1 – Eachanari–Kovaipudur Belt.xlsx</Text> and that
        route already exists with a matching name. Optional: area, offer_type, offer_buy, offer_get, offer_min_qty (or
        offer_min-qty), bundle_price, opening_balance. Duplicate name+route rows are skipped.
      </Text>

      <View style={screenStyles.card}>
        <Text style={{ color: COLORS.textSecondary, lineHeight: 22, fontSize: 14 }}>
          Tip: prepare the file on a computer, send it to your phone (AirDrop, email, Drive), then pick it here.
        </Text>
      </View>

      <TouchableOpacity
        onPress={pickFile}
        disabled={busy}
        style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.primaryBtnText}>Choose Excel file</Text>
        )}
      </TouchableOpacity>
    </Screen>
  );
}
