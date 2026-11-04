import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { API_BASE, mediaUrl } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";

const OFFER_LABELS: Record<string, string> = {
  none: "None",
  flat: "Buy X get Y free",
  flat_carry: "Buy X+Y across days",
  threshold: "Free above minimum",
  bundle: "Bundle price",
};

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

export default function AdminStoreEditScreen() {
  const router = useRouter();
  const { store_id } = useLocalSearchParams<{ store_id?: string; route_id?: string }>();
  const { adminSecret, isAdmin, ready } = useAdminAuth();
  const sid = Number(store_id);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [offerType, setOfferType] = useState("none");
  const [buy, setBuy] = useState("");
  const [get, setGet] = useState("");
  const [minQty, setMinQty] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [savedPhotoPath, setSavedPhotoPath] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  const hydrate = useCallback((s: StoreDetail) => {
      setName(s.name ?? "");
      setArea(s.area ?? "");
      setPrice(String(s.price ?? ""));
      setOfferType((s.offer_type || "none").toLowerCase());
      setBuy(String(s.offer_buy ?? ""));
      setGet(String(s.offer_get ?? ""));
      setMinQty(String(s.offer_min_qty ?? ""));
      setBundlePrice(String(s.bundle_price ?? ""));
      setLocationUrl(s.location_url ?? "");
      setOpeningBalance(String(s.opening_balance ?? ""));
      setNotes(s.notes ?? "");
      setIsActive(s.is_active !== false);
      setSavedPhotoPath(s.photo_url);
      setPhotoUri(null);
  }, []);

  const load = useCallback(async () => {
    if (!store_id || Number.isNaN(sid) || sid <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/store/${sid}`, { cache: "no-store" });
      if (!res.ok) {
        Alert.alert("Not found", "Could not load this store.");
        router.back();
        return;
      }
      const data = (await res.json()) as StoreDetail;
      hydrate(data);
    } catch {
      Alert.alert("Error", "Network problem.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [store_id, sid, hydrate, router]);

  useFocusEffect(
    useCallback(() => {
      if (ready && isAdmin) void load();
    }, [ready, isAdmin, load])
  );

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Allow photo library access to change the store photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
  };

  const uploadPhoto = async (localUri: string): Promise<string | null> => {
    const form = new FormData();
    const fname = localUri.split("/").pop() || "photo.jpg";
    form.append("file", { uri: localUri, name: fname, type: "image/jpeg" } as any);
    const res = await fetch(`${API_BASE}/upload/store-photo`, { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.photo_url === "string" ? data.photo_url : null;
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Allow location permission to autofill map link.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      setLocationUrl(`https://maps.google.com/?q=${lat},${lon}`);
      Alert.alert("Location added", "Current location has been set as a map link.");
    } catch {
      Alert.alert("Location error", "Could not fetch your current location.");
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Required", "Enter store name and price.");
      return;
    }
    if (Number.isNaN(sid) || sid <= 0) return;

    setBusy(true);
    try {
      let photoUrl = savedPhotoPath;
      if (photoUri) {
        const up = await uploadPhoto(photoUri);
        if (!up) {
          Alert.alert("Upload failed", "Could not upload photo.");
          setBusy(false);
          return;
        }
        photoUrl = up;
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        area: area.trim() || null,
        price: Number(price),
        offer_type: offerType,
        offer_buy: Number(buy) || 0,
        offer_get: Number(get) || 0,
        offer_min_qty: Number(minQty) || 0,
        bundle_price: Number(bundlePrice) || 0,
        location_url: locationUrl.trim() || null,
        notes: notes.trim() || null,
        opening_balance: Number(openingBalance) || 0,
        is_active: isActive,
        photo_url: photoUrl ?? null,
      };

      const res = await fetch(`${API_BASE}/store/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const err = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof err.detail === "string" ? err.detail : "Try again.";
        Alert.alert(res.status === 409 ? "Duplicate store name" : "Could not save", detail);
        return;
      }
      hydrate(err as StoreDetail);
      setPhotoUri(null);
      Alert.alert("Saved", "Store updated.");
      router.back();
    } catch {
      Alert.alert("Error", "Network problem.");
    } finally {
      setBusy(false);
    }
  };

  const removeStore = () => {
    if (!adminSecret || Number.isNaN(sid) || sid <= 0) return;
    Alert.alert(
      "Delete store?",
      "Removes this store and its visit history for this store. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await fetch(`${API_BASE}/admin/stores/${sid}`, {
                method: "DELETE",
                headers: adminSecretHeaders(adminSecret),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok) {
                Alert.alert("Error", typeof j.detail === "string" ? j.detail : "Could not delete");
                return;
              }
              router.back();
            } catch {
              Alert.alert("Error", "Network problem.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const label = { color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" as const };
  const inputStyle = [screenStyles.input, { marginBottom: 14, backgroundColor: COLORS.card }];
  const preview = photoUri ? photoUri : mediaUrl(savedPhotoPath);

  if (!ready || !isAdmin) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!store_id || Number.isNaN(sid) || sid <= 0) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={screenStyles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.textSecondary, marginTop: 24 }}>Missing store.</Text>
      </Screen>
    );
  }

  if (loading) {
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

      <Text style={screenStyles.title}>Edit store</Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 16 }]}>
        Name, price, offers, photo, map link, and active status.
      </Text>

      <Text style={label}>Store photo</Text>
      {preview ? (
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
          <Image
            source={{ uri: preview }}
            style={{
              width: "100%",
              height: 180,
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: COLORS.border,
            }}
            contentFit="cover"
          />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={pickPhoto} style={[screenStyles.secondaryBtn, { marginBottom: 16 }]}>
        <Text style={screenStyles.secondaryBtnText}>{preview ? "Change photo" : "Choose photo"}</Text>
      </TouchableOpacity>

      <Text style={label}>Store name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Shop or customer name"
        placeholderTextColor={placeholderColor}
        style={inputStyle}
        editable={!busy}
      />

      <Text style={label}>Area (optional)</Text>
      <TextInput
        value={area}
        onChangeText={setArea}
        placeholder="Neighbourhood or zone"
        placeholderTextColor={placeholderColor}
        style={inputStyle}
        editable={!busy}
      />

      <Text style={label}>Price per unit (₹)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="e.g. 35"
        placeholderTextColor={placeholderColor}
        keyboardType="decimal-pad"
        style={inputStyle}
        editable={!busy}
      />

      <Text style={label}>Opening balance (₹)</Text>
      <TextInput
        value={openingBalance}
        onChangeText={setOpeningBalance}
        placeholder="0"
        placeholderTextColor={placeholderColor}
        keyboardType="decimal-pad"
        style={inputStyle}
        editable={!busy}
      />

      <Text style={label}>Map / location link</Text>
      <TextInput
        value={locationUrl}
        onChangeText={setLocationUrl}
        placeholder="Google Maps or any URL"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={inputStyle}
        editable={!busy}
      />
      <TouchableOpacity
        onPress={useCurrentLocation}
        disabled={busy || locating}
        style={[screenStyles.secondaryBtn, { marginBottom: 14 }, (busy || locating) && { opacity: 0.75 }]}
      >
        {locating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.secondaryBtnText}>Use current location</Text>
        )}
      </TouchableOpacity>

      <Text style={label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Landmarks, contact…"
        placeholderTextColor={placeholderColor}
        multiline
        style={[...inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
        editable={!busy}
      />

      <TouchableOpacity
        onPress={() => setIsActive(!isActive)}
        disabled={busy}
        style={[
          screenStyles.card,
          { padding: 14, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        ]}
      >
        <Text style={{ color: COLORS.textPrimary, fontWeight: "600" }}>Active on route</Text>
        <Text style={{ color: isActive ? COLORS.primary : COLORS.textDisabled, fontWeight: "700" }}>
          {isActive ? "Yes" : "No (inactive)"}
        </Text>
      </TouchableOpacity>

      <Text style={screenStyles.sectionLabel}>Offer</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {(["none", "flat", "flat_carry", "threshold", "bundle"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setOfferType(type)}
            disabled={busy}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: offerType === type ? COLORS.primary : COLORS.border,
              marginRight: 6,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: offerType === type ? "#FFF" : COLORS.textPrimary }}>
              {OFFER_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {offerType === "flat" && (
        <>
          <Text style={label}>Buy quantity</Text>
          <TextInput
            value={buy}
            onChangeText={setBuy}
            placeholder="e.g. 10"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
          <Text style={label}>Free quantity</Text>
          <TextInput
            value={get}
            onChangeText={setGet}
            placeholder="e.g. 1"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
        </>
      )}

      {offerType === "flat_carry" && (
        <>
          <Text style={label}>Buy quantity</Text>
          <TextInput
            value={buy}
            onChangeText={setBuy}
            placeholder="e.g. 10"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
          <Text style={label}>Free quantity (carry-forward)</Text>
          <TextInput
            value={get}
            onChangeText={setGet}
            placeholder="e.g. 1"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
        </>
      )}

      {offerType === "threshold" && (
        <>
          <Text style={label}>Minimum quantity</Text>
          <TextInput
            value={minQty}
            onChangeText={setMinQty}
            placeholder="e.g. 30"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
          <Text style={label}>Free quantity when qualified</Text>
          <TextInput
            value={get}
            onChangeText={setGet}
            placeholder="e.g. 1"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
        </>
      )}

      {offerType === "bundle" && (
        <>
          <Text style={label}>Units per bundle</Text>
          <TextInput
            value={buy}
            onChangeText={setBuy}
            placeholder="e.g. 3"
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
          <Text style={label}>Bundle price (₹)</Text>
          <TextInput
            value={bundlePrice}
            onChangeText={setBundlePrice}
            placeholder="e.g. 100"
            keyboardType="decimal-pad"
            placeholderTextColor={placeholderColor}
            style={inputStyle}
            editable={!busy}
          />
        </>
      )}

      <TouchableOpacity onPress={save} disabled={busy} style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={screenStyles.primaryBtnText}>Save changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={removeStore}
        disabled={busy}
        style={{ marginTop: 16, marginBottom: 32, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: COLORS.error, fontWeight: "700", fontSize: 16 }}>Delete store</Text>
      </TouchableOpacity>
    </Screen>
  );
}
