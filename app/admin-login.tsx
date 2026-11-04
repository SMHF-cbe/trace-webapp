import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { loginWithPassword } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password.trim()) {
      Alert.alert("Password required", "Enter the server admin password.");
      return;
    }
    setBusy(true);
    try {
      const ok = await loginWithPassword(password);
      if (!ok) {
        Alert.alert("Sign-in failed", "That password does not match the server admin secret.");
        return;
      }
      router.replace("/admin-dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.replace("/")} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Home</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Admin sign in</Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 20 }]}>
        Enter the same value as <Text style={{ fontWeight: "700" }}>ADMIN_SECRET</Text> on your API server. Staff do not
        use this screen.
      </Text>

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" }}>
        Admin password
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Admin secret"
        placeholderTextColor={placeholderColor}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        style={[screenStyles.input, { marginBottom: 20, backgroundColor: COLORS.card }]}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={busy}
        style={[screenStyles.primaryBtn, busy && { opacity: 0.75 }]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.primaryBtnText}>Continue to admin</Text>
        )}
      </TouchableOpacity>
    </Screen>
  );
}
