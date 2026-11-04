import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";
import { ROUTE_PIN_REGEX, sanitizeRoutePinDigits } from "../constants/routePassword";

function excelUploadFilename(routeCode: number, routeName: string): string {
  const safe = routeName.replace(/[/\\?*\[\]:]/g, "-").trim() || "route";
  return `Route ${routeCode} - ${safe}.xlsx`;
}

export default function AdminScreen() {
  const router = useRouter();
  const { adminSecret, isAdmin, ready } = useAdminAuth();
  const [routeCode, setRouteCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  const getForm = () => {
    const codeNum = parseInt(routeCode.trim(), 10);
    const nameTrim = name.trim();

    if (!adminSecret?.trim() || !routeCode.trim() || Number.isNaN(codeNum) || codeNum < 1) {
      Alert.alert("Missing information", "Enter a positive route ID (e.g. 1), route name, and a 4-digit route PIN.");
      return null;
    }
    if (!nameTrim) {
      Alert.alert("Missing information", "Enter the route name (e.g. Eachanari-Kovaipudur Belt).");
      return null;
    }
    if (!ROUTE_PIN_REGEX.test(password)) {
      Alert.alert("4-digit PIN required", "Route password must be exactly 4 digits (0-9), e.g. 7391.");
      return null;
    }

    return { codeNum, nameTrim, password };
  };

  const createRoute = async (form: { codeNum: number; nameTrim: string; password: string }) => {
    const res = await fetch(`${API_BASE}/admin/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminSecretHeaders(adminSecret) },
      body: JSON.stringify({
        route_code: form.codeNum,
        name: form.nameTrim,
        password: form.password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  const submit = async () => {
    const form = getForm();
    if (!form) return;

    setBusy(true);
    try {
      const { res, data } = await createRoute(form);
      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((d: { msg?: string }) => d.msg).join("\n")
              : "Could not create route";
        Alert.alert(res.status === 409 ? "Duplicate route ID or name" : "Could not create", msg);
        return;
      }

      Alert.alert(
        "Done",
        `Route ${data.route_code} - "${data.name}" is ready. Staff can sign in with the route password you set.`
      );
      setPassword("");
      setRouteCode("");
      setName("");
      router.replace("/admin-dashboard");
    } catch {
      Alert.alert("Error", "Network or server error. Is the API reachable?");
    } finally {
      setBusy(false);
    }
  };

  const createRouteAndImport = async () => {
    const form = getForm();
    if (!form) return;

    setImportBusy(true);
    try {
      const { res, data } = await createRoute(form);
      if (!res.ok) {
        const msg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((d: { msg?: string }) => d.msg).join("\n")
              : "Could not create route";
        Alert.alert(res.status === 409 ? "Duplicate route ID or name" : "Could not create", msg);
        return;
      }

      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (picked.canceled) {
        Alert.alert("Route created", "Route created. Import was cancelled.");
        router.replace("/admin-dashboard");
        return;
      }

      const file = picked.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: excelUploadFilename(form.codeNum, form.nameTrim),
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      } as any);

      const importRes = await fetch(`${API_BASE}/import/stores`, {
        method: "POST",
        headers: adminSecretHeaders(adminSecret),
        body: formData,
      });
      const json = await importRes.json().catch(() => ({}));

      if (!importRes.ok) {
        Alert.alert("Import failed", typeof json.detail === "string" ? json.detail : "Check columns and try again.");
        return;
      }

      Alert.alert("Done", typeof json.message === "string" ? json.message : "Route created and stores imported.");
      setPassword("");
      setRouteCode("");
      setName("");
      router.replace("/admin-dashboard");
    } catch {
      Alert.alert("Error", "Network or server error. Is the API reachable?");
    } finally {
      setImportBusy(false);
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

      <Text style={screenStyles.title}>Create a route</Text>
      <Text style={styles.hint}>Create the route first, then optionally import stores in the same screen.</Text>

      <Text style={styles.label}>Route ID (business number)</Text>
      <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginBottom: 6 }}>
        {`Used in Excel and file names like "Route 1 - ...". Must be unique.`}
      </Text>
      <TextInput
        value={routeCode}
        onChangeText={(t) => setRouteCode(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        placeholder="e.g. 1"
        placeholderTextColor={placeholderColor}
        style={styles.input}
        editable={!busy && !importBusy}
      />

      <Text style={styles.label}>Route name (shown in app)</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Eachanari-Kovaipudur Belt"
        placeholderTextColor={placeholderColor}
        style={styles.input}
        editable={!busy && !importBusy}
      />

      <Text style={styles.label}>Route PIN (4 digits)</Text>
      <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginBottom: 6 }}>
        Staff use this code to open the route.
      </Text>
      <TextInput
        value={password}
        onChangeText={(t) => setPassword(sanitizeRoutePinDigits(t))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="e.g. 4829"
        placeholderTextColor={placeholderColor}
        style={styles.input}
        editable={!busy && !importBusy}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={busy || importBusy}
        style={[screenStyles.primaryBtn, (busy || importBusy) && { opacity: 0.75 }]}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={screenStyles.primaryBtnText}>Create route</Text>}
      </TouchableOpacity>

      <View style={styles.importSection}>
        <Text style={styles.importTitle}>Import stores while creating route</Text>
        <Text style={styles.importHint}>
          This will first create the route. If route ID or route name already exists, creation is blocked and import
          will not continue. After successful create, pick an Excel file to import stores.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => void createRouteAndImport()}
        disabled={busy || importBusy}
        style={[screenStyles.secondaryBtn, (busy || importBusy) && { opacity: 0.75 }]}
      >
        {importBusy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.secondaryBtnText}>Create route and import stores</Text>
        )}
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: COLORS.textDisabled,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 22,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
  },
  importSection: {
    marginTop: 14,
    marginBottom: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  importTitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  importHint: {
    color: COLORS.textDisabled,
    fontSize: 13,
    lineHeight: 19,
  },
});
