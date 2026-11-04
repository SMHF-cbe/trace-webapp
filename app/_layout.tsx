import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../context/SessionContext";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import "../components/patchWebAlerts";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AdminAuthProvider>
        <SessionProvider>
          <Slot />
        </SessionProvider>
      </AdminAuthProvider>
    </SafeAreaProvider>
  );
}
