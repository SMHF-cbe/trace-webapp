import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { API_BASE, mediaUrl } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

type StoreDetail = {
  id: number;
  name: string;
  area: string | null;
  price: number;
  offer_type: string;
  offer_buy: number;
  offer_get: number;
  offer_min_qty: number;
  bundle_price: number;
  photo_url: string | null;
  location_url: string | null;
  notes: string | null;
  is_active: boolean;
  route_id: number | null;
  opening_balance?: number;
};

function offerDescription(s: StoreDetail): string {
  const t = (s.offer_type || "none").toLowerCase();
  if (t === "none") return "No special offer — billed at price × units.";
  if (t === "flat")
    return `Buy ${s.offer_buy} get ${s.offer_get} free (repeats). Price applies to billable units after free qty.`;
  if (t === "flat_carry")
    return `Carry-forward buy ${s.offer_buy} get ${s.offer_get} free across days. Free units apply when cumulative deliveries cross each cycle.`;
  if (t === "threshold")
    return `If delivered ≥ ${s.offer_min_qty}, ${s.offer_get} units free.`;
  if (t === "bundle")
    return `Every ${s.offer_buy} units as one bundle at ₹${s.bundle_price}; remainder at ₹${s.price} each.`;
  return s.offer_type;
}

export default function StoreInfoScreen() {
  const router = useRouter();
  const { store_id, route_id } = useLocalSearchParams();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!store_id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/store/${store_id}`);
      if (!res.ok) {
        setStore(null);
        return;
      }
      const data = await res.json();
      setStore(data);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [store_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setActive = async (value: boolean) => {
    if (!store_id) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/store/${store_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        Alert.alert("Error", typeof j.detail === "string" ? j.detail : "Could not update");
        return;
      }
      setStore((prev) => (prev ? { ...prev, is_active: value } : null));
    } catch {
      Alert.alert("Error", "Network problem");
    } finally {
      setBusy(false);
    }
  };

  const openMaps = () => {
    const u = store?.location_url?.trim();
    if (!u) return;
    Linking.openURL(u).catch(() => Alert.alert("Could not open link"));
  };

  if (loading) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!store) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={screenStyles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.textDisabled, marginTop: 24 }}>Store not found.</Text>
      </Screen>
    );
  }

  const img = mediaUrl(store.photo_url);

  return (
    <Screen scroll edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={screenStyles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Store details</Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 16 }]}>
        Everything a new driver needs: photo, price, offer rules, and map link.
      </Text>

      {img ? (
        <Image
          source={{ uri: img }}
          style={{
            width: "100%",
            height: 200,
            borderRadius: 12,
            marginBottom: 16,
            backgroundColor: COLORS.border,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            height: 120,
            borderRadius: 12,
            backgroundColor: COLORS.surface,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: COLORS.textDisabled }}>No photo yet</Text>
        </View>
      )}

      <View style={screenStyles.card}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 }}>
          {store.name}
        </Text>
        {store.area ? (
          <Text style={{ color: COLORS.textSecondary, marginBottom: 8 }}>Area: {store.area}</Text>
        ) : null}
        <Text style={{ color: COLORS.textPrimary, fontSize: 18, marginBottom: 8 }}>
          Price: ₹{store.price} per unit
        </Text>
        {Number(store.opening_balance) > 0.005 ? (
          <Text style={{ color: COLORS.warning, fontSize: 15, marginBottom: 8, fontWeight: "600" }}>
            Opening balance (carried): ₹{Number(store.opening_balance).toFixed(2)}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Active on route</Text>
            <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 2 }}>
              Inactive stores stay visible when you enable &quot;Show inactive&quot; on the list.
            </Text>
          </View>
          <Switch
            value={store.is_active}
            onValueChange={setActive}
            disabled={busy}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
      </View>

      <View style={screenStyles.card}>
        <Text style={screenStyles.sectionLabel}>Offer rule</Text>
        <Text style={{ color: COLORS.textPrimary, lineHeight: 22 }}>{offerDescription(store)}</Text>
      </View>

      {store.notes ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.sectionLabel}>Notes</Text>
          <Text style={{ color: COLORS.textPrimary, lineHeight: 22 }}>{store.notes}</Text>
        </View>
      ) : null}

      <View style={screenStyles.card}>
        <Text style={screenStyles.sectionLabel}>Location</Text>
        {store.location_url ? (
          <TouchableOpacity onPress={openMaps}>
            <Text style={{ color: COLORS.primary, textDecorationLine: "underline", lineHeight: 22 }}>
              {store.location_url}
            </Text>
            <Text style={{ color: COLORS.textDisabled, fontSize: 13, marginTop: 6 }}>Tap to open in browser / maps</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>No map link saved.</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/entry",
            params: {
              store_id: String(store.id),
              route_id: String(route_id ?? store.route_id ?? ""),
              name: store.name,
            },
          })
        }
        disabled={!store.is_active}
        style={[screenStyles.primaryBtn, !store.is_active && { opacity: 0.5 }]}
      >
        <Text style={screenStyles.primaryBtnText}>
          {store.is_active ? "Go to today’s entry" : "Activate store to add entries"}
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
