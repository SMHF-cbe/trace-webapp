import { useState } from "react";
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
import { COLORS } from "../constants/colors";
import { API_BASE, mediaUrl } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

const OFFER_LABELS: Record<string, string> = {
  none: "None",
  flat: "Buy X get Y free",
  flat_carry: "Buy X+Y across days",
  threshold: "Free above minimum",
  bundle: "Bundle price",
};

export default function AddStore() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const route_id = params.route_id;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const [offerType, setOfferType] = useState("none");

  const [buy, setBuy] = useState("");
  const [get, setGet] = useState("");
  const [minQty, setMinQty] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Allow photo library access to attach a store photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
    setUploadedPhotoPath(null);
  };

  const uploadPhoto = async (localUri: string): Promise<string | null> => {
    const form = new FormData();
    const name = localUri.split("/").pop() || "photo.jpg";
    form.append("file", {
      uri: localUri,
      name,
      type: "image/jpeg",
    } as any);
    const res = await fetch(`${API_BASE}/upload/store-photo`, {
      method: "POST",
      body: form,
    });
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
    if (!name || !price) {
      Alert.alert("Required", "Enter store name and price.");
      return;
    }

    if (route_id == null || route_id === "") {
      Alert.alert("Missing route", "Open Add store from your route’s store list.");
      return;
    }

    setBusy(true);
    try {
      let photoUrl: string | null = uploadedPhotoPath;
      if (photoUri && !uploadedPhotoPath) {
        const up = await uploadPhoto(photoUri);
        if (!up) {
          Alert.alert("Upload failed", "Could not upload photo. Try again or save without photo.");
          setBusy(false);
          return;
        }
        photoUrl = up;
        setUploadedPhotoPath(up);
      }

      const res = await fetch(`${API_BASE}/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          route_id: Number(route_id),

          offer_type: offerType,
          offer_buy: Number(buy) || 0,
          offer_get: Number(get) || 0,
          offer_min_qty: Number(minQty) || 0,
          bundle_price: Number(bundlePrice) || 0,
          photo_url: photoUrl || undefined,
          location_url: locationUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          opening_balance: Number(openingBalance) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.detail === "string" ? err.detail : "Try again.";
        Alert.alert(res.status === 409 ? "Duplicate store name" : "Could not save", detail);
        return;
      }

      Alert.alert("Saved", "Store added to this route.");
      router.back();
    } catch {
      Alert.alert("Error", "Network problem.");
    } finally {
      setBusy(false);
    }
  };

  const label = { color: "#FFFFFF" as const, marginBottom: 6, fontSize: 14, fontWeight: "500" as const };
  const inputStyle = [
    screenStyles.input,
    { marginBottom: 14, backgroundColor: "#FFFFFF" },
  ];

  const preview = photoUri ? photoUri : mediaUrl(uploadedPhotoPath);

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Add store</Text>
      <Text style={screenStyles.subtitle}>
        Add a photo and map link so the next person can find the shop. Photo uploads to your server.
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
      <TouchableOpacity
        onPress={pickPhoto}
        style={[screenStyles.secondaryBtn, { marginBottom: 16 }]}
      >
        <Text style={screenStyles.secondaryBtnText}>{preview ? "Change photo" : "Choose photo"}</Text>
      </TouchableOpacity>

      <Text style={label}>Store name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Shop or customer name"
        placeholderTextColor={placeholderColor}
        style={inputStyle}
      />

      <Text style={label}>Price per unit (₹)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="e.g. 35"
        placeholderTextColor={placeholderColor}
        keyboardType="decimal-pad"
        style={inputStyle}
      />

      <Text style={label}>Opening balance (₹, optional)</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 6, marginTop: -8 }}>
        Amount they already owe you before the first visit in this app. Adds to outstanding and ledger.
      </Text>
      <TextInput
        value={openingBalance}
        onChangeText={setOpeningBalance}
        placeholder="0 — leave blank if none"
        placeholderTextColor={placeholderColor}
        keyboardType="decimal-pad"
        style={inputStyle}
      />

      <Text style={label}>Map / location link (optional)</Text>
      <TextInput
        value={locationUrl}
        onChangeText={setLocationUrl}
        placeholder="Paste Google Maps link or any URL"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={inputStyle}
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

      <Text style={label}>Notes (optional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Landmarks, gate colour, contact…"
        placeholderTextColor={placeholderColor}
        multiline
        style={[...inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
      />

      <Text style={screenStyles.sectionLabel}>Offer (optional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {(["none", "flat", "flat_carry", "threshold", "bundle"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setOfferType(type)}
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
          <TextInput placeholder="e.g. 10" onChangeText={setBuy} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />

          <Text style={label}>Free quantity</Text>
          <TextInput placeholder="e.g. 1" onChangeText={setGet} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />
        </>
      )}

      {offerType === "flat_carry" && (
        <>
          <Text style={label}>Buy quantity</Text>
          <TextInput placeholder="e.g. 10" onChangeText={setBuy} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />

          <Text style={label}>Free quantity (carry-forward)</Text>
          <TextInput placeholder="e.g. 1" onChangeText={setGet} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />
        </>
      )}

      {offerType === "threshold" && (
        <>
          <Text style={label}>Minimum quantity to qualify</Text>
          <TextInput placeholder="e.g. 30" onChangeText={setMinQty} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />

          <Text style={label}>Free quantity when qualified</Text>
          <TextInput placeholder="e.g. 1" onChangeText={setGet} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />
        </>
      )}

      {offerType === "bundle" && (
        <>
          <Text style={label}>Units per bundle</Text>
          <TextInput placeholder="e.g. 3" onChangeText={setBuy} keyboardType="number-pad" placeholderTextColor={placeholderColor} style={inputStyle} />

          <Text style={label}>Bundle price (₹)</Text>
          <TextInput placeholder="e.g. 100" onChangeText={setBundlePrice} keyboardType="decimal-pad" placeholderTextColor={placeholderColor} style={inputStyle} />
        </>
      )}

      <TouchableOpacity onPress={save} disabled={busy} style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={screenStyles.primaryBtnText}>Save store</Text>}
      </TouchableOpacity>
    </Screen>
  );
}
