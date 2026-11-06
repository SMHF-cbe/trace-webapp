import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { DraggableStoreList } from "../components/DraggableStoreList";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";
import { ROUTE_PIN_REGEX, sanitizeRoutePinDigits } from "../constants/routePassword";

export default function AdminRouteEditScreen() {
  const router = useRouter();
  const { route_id, route_code, name } = useLocalSearchParams<{
    route_id?: string;
    route_code?: string;
    name?: string;
  }>();
  const { adminSecret, isAdmin, ready } = useAdminAuth();
  const [routeCodeStr, setRouteCodeStr] = useState(String(route_code ?? ""));
  const [routeName, setRouteName] = useState(String(name ?? ""));
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [storesOpen, setStoresOpen] = useState(false);
  type StoreRow = { id: number; name: string; price: number; is_active: boolean; sort_order?: number };
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesSaving, setStoresSaving] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  useEffect(() => {
    setRouteCodeStr(String(route_code ?? ""));
    setRouteName(String(name ?? ""));
  }, [route_code, name]);

  const rid = Number(route_id);

  const loadStores = useCallback(async () => {
    if (!route_id || Number.isNaN(rid) || rid <= 0) return;
    setStoresLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stores/${rid}?include_inactive=true`, { cache: "no-store" });
      if (!res.ok) {
        setStores([]);
        return;
      }
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch {
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, [route_id, rid]);

  const toggleStoresPanel = useCallback(() => {
    setStoresOpen((prev) => {
      const next = !prev;
      if (next) void loadStores();
      return next;
    });
  }, [loadStores]);

  const reorderStores = useCallback(
    async (nextStores: StoreRow[]) => {
      if (!adminSecret) return;
      const previous = stores;
      setStores(nextStores);
      setStoresSaving(true);
      try {
        const res = await fetch(`${API_BASE}/admin/stores/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...adminSecretHeaders(adminSecret) },
          body: JSON.stringify({
            route_id: rid,
            stores: nextStores.map((store, index) => ({ id: store.id, sort_order: index })),
          }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          setStores(previous);
          Alert.alert("Could not reorder", typeof detail.detail === "string" ? detail.detail : "Try again.");
        }
      } catch {
        setStores(previous);
        Alert.alert("Could not reorder", "Network problem. The previous order was restored.");
      } finally {
        setStoresSaving(false);
      }
    },
    [adminSecret, rid, stores]
  );

  useFocusEffect(
    useCallback(() => {
      if (storesOpen) void loadStores();
    }, [storesOpen, loadStores])
  );
  if (!route_id || Number.isNaN(rid) || rid <= 0) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={screenStyles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.textSecondary, marginTop: 24 }}>Missing route.</Text>
      </Screen>
    );
  }

  const save = async () => {
    if (!adminSecret) return;
    const codeNum = parseInt(routeCodeStr.trim(), 10);
    if (Number.isNaN(codeNum) || codeNum < 1) {
      Alert.alert("Route ID required", "Enter a positive route ID (e.g. 1).");
      return;
    }
    if (!routeName.trim()) {
      Alert.alert("Name required", "Enter a route name.");
      return;
    }
    if (newPassword.trim() && !ROUTE_PIN_REGEX.test(newPassword)) {
      Alert.alert(
        "4-digit PIN required",
        "New route PIN must be exactly 4 digits (0-9), or leave blank to keep the current PIN."
      );
      return;
    }
    setBusy(true);
    try {
      const body: { route_code: number; name: string; password?: string } = {
        route_code: codeNum,
        name: routeName.trim(),
      };
      if (newPassword.trim()) body.password = newPassword.trim();
      const res = await fetch(`${API_BASE}/admin/routes/${rid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminSecretHeaders(adminSecret) },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Try again.";
        Alert.alert(res.status === 409 ? "Duplicate route ID or name" : "Could not save", detail);
        return;
      }
      Alert.alert("Saved", "Route updated.");
      setNewPassword("");
      router.back();
    } catch {
      Alert.alert("Error", "Network problem.");
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
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Edit route</Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 16 }]}>Update route ID, name, or PIN.</Text>

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" }}>
        Route ID (business number)
      </Text>
      <TextInput
        value={routeCodeStr}
        onChangeText={(t) => setRouteCodeStr(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        placeholder="e.g. 1"
        placeholderTextColor={placeholderColor}
        style={[screenStyles.input, { marginBottom: 16, backgroundColor: COLORS.card }]}
        editable={!busy}
      />

      <TouchableOpacity
        onPress={toggleStoresPanel}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={storesOpen ? "Hide stores on this route" : "Show stores on this route"}
        style={styles.routeNameLabelRow}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" }}>Route name</Text>
          <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
            Tap to {storesOpen ? "hide" : "list"} stores · edit offers, price, photo, delete
          </Text>
        </View>
        <Text style={{ color: COLORS.textSecondary, fontSize: 18, fontWeight: "700" }}>
          {storesOpen ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>
      <TextInput
        value={routeName}
        onChangeText={setRouteName}
        placeholder="Route name"
        placeholderTextColor={placeholderColor}
        style={[screenStyles.input, { marginBottom: storesOpen ? 10 : 16, backgroundColor: COLORS.card }]}
        editable={!busy}
      />

      {storesOpen ? (
        <View style={styles.storesPanel}>
          <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginBottom: 10 }}>
            {storesLoading ? "Loading…" : `${stores.length} store(s) — tap a row for full edit`}
          </Text>
          {storesLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : stores.length === 0 ? (
            <Text style={{ color: COLORS.textDisabled, marginBottom: 12, fontSize: 14 }}>
              No stores yet. Use Add store or Import from the admin menu.
            </Text>
          ) : (
            <DraggableStoreList
              stores={stores}
              saving={storesSaving}
              onReorder={reorderStores}
              onOpenStore={(item) =>
                router.push({
                  pathname: "/admin-store-edit",
                  params: { store_id: String(item.id), route_id: String(rid) },
                })
              }
            />
          )}
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/add-store", params: { route_id: String(rid) } })
            }
            style={[screenStyles.secondaryBtn, { marginTop: 4 }]}
          >
            <Text style={screenStyles.secondaryBtnText}>Add store</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" }}>
        New route PIN (optional)
      </Text>
      <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginBottom: 6 }}>
        Leave blank to keep the current PIN. Must be exactly 4 digits if you change it.
      </Text>
      <TextInput
        value={newPassword}
        onChangeText={(t) => setNewPassword(sanitizeRoutePinDigits(t))}
        placeholder="e.g. 5910"
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        maxLength={4}
        style={[screenStyles.input, { marginBottom: 20, backgroundColor: COLORS.card }]}
        editable={!busy}
      />

      <TouchableOpacity
        onPress={save}
        disabled={busy}
        style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={screenStyles.primaryBtnText}>Save changes</Text>}
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  routeNameLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  storesPanel: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});