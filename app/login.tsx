import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { useSession } from "../context/SessionContext";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { ROUTE_PIN_REGEX, sanitizeRoutePinDigits } from "../constants/routePassword";

export default function LoginScreen() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { setSession } = useSession();

  const { route_id, name } = useLocalSearchParams();

  const handleLogin = async () => {
    if (!ROUTE_PIN_REGEX.test(password)) {
      Alert.alert("4-digit PIN", "Enter the 4-digit route PIN for this route.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/routes/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id: Number(route_id),
          password,
        }),
      });

      if (res.status === 200) {
        const data = (await res.json().catch(() => ({}))) as {
          route_id?: number;
          route_code?: number | null;
          name?: string;
        };
        const internalId = Number(data.route_id ?? route_id);
        const routeCode =
          data.route_code != null && !Number.isNaN(Number(data.route_code))
            ? Number(data.route_code)
            : internalId;
        const routeLabel =
          data.name != null && String(data.name).trim() !== ""
            ? `Route ${routeCode} – ${data.name}`
            : String(name ?? "");
        await setSession(internalId, routeLabel);
        router.push({
          pathname: "/tabs/stores",
          params: { route_id: String(internalId), name: routeLabel },
        });
        return;
      }

      const errBody = await res.json().catch(() => ({}));
      const msg =
        typeof errBody.detail === "string"
          ? errBody.detail
          : "That password does not match. Try again or ask your supervisor.";
      Alert.alert("Sign-in failed", msg);
    } catch {
      Alert.alert(
        "Cannot reach server",
        "Check Wi‑Fi and that EXPO_PUBLIC_API_URL points to your computer or API."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back to routes</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Sign in to route</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "600", marginBottom: 4 }}>
        {name}
      </Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 20 }]}>
        Enter the 4-digit PIN your admin set for this route.
      </Text>

      <View style={screenStyles.card}>
        <Text style={screenStyles.sectionLabel}>Route PIN (4 digits)</Text>
        <TextInput
          value={password}
          onChangeText={(t) => setPassword(sanitizeRoutePinDigits(t))}
          placeholder="••••"
          placeholderTextColor={placeholderColor}
          keyboardType="number-pad"
          maxLength={4}
          editable={!busy}
          autoCapitalize="none"
          autoCorrect={false}
          style={screenStyles.input}
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />
      </View>

      <TouchableOpacity
        onPress={handleLogin}
        disabled={busy}
        style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel="Continue to store list"
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.primaryBtnText}>Continue to stores</Text>
        )}
      </TouchableOpacity>
    </Screen>
  );
}
