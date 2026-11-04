import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

type RouteItem = { id: number; route_code: number; name: string };

function normalizeRouteRow(r: { id: number; name: string; route_code?: number | null }): RouteItem {
  const id = Number(r.id);
  const code = r.route_code != null && !Number.isNaN(Number(r.route_code)) ? Number(r.route_code) : id;
  return { id, route_code: code, name: String(r.name ?? "") };
}

export default function StaffRoutesScreen() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/routes`, { cache: "no-store" });
      if (!res.ok) {
        setError("Could not load routes. Check the server and your connection.");
        setRoutes([]);
        return;
      }
      const data = await res.json();
      setRoutes(Array.isArray(data) ? data.map((row: { id: number; name: string; route_code?: number | null }) => normalizeRouteRow(row)) : []);
    } catch {
      setError("No connection to the server. Is the API running and EXPO_PUBLIC_API_URL correct?");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={() => router.replace("/")} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Home</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>route_sync</Text>
        <Text style={screenStyles.subtitle}>
          Choose your delivery route, then enter the route password. One person per route.
        </Text>

        <Text style={[screenStyles.sectionLabel, { marginBottom: 10 }]}>Your routes</Text>

        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />}

        {error && !loading && (
          <View
            style={[
              screenStyles.card,
              { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" },
            ]}
          >
            <Text style={{ color: "#FCA5A5", lineHeight: 22 }}>{error}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && routes.length === 0 && (
          <View style={screenStyles.card}>
            <Text style={{ color: COLORS.textSecondary, lineHeight: 22 }}>
              No routes yet. Ask an admin to create one from the admin login on the home screen.
            </Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Refresh list</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && routes.length > 0 && (
          <FlatList
            data={routes}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />
            }
            scrollEnabled
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/login?route_id=${item.id}&name=${encodeURIComponent(`Route ${item.route_code} – ${item.name}`)}`
                  )
                }
                style={{
                  backgroundColor: COLORS.card,
                  padding: 18,
                  borderRadius: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open route ${item.name}`}
              >
                <Text style={{ fontSize: 17, color: COLORS.textPrimary, fontWeight: "600" }}>
                  Route {item.route_code ?? item.id} – {item.name}
                </Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 6, fontSize: 14 }}>
                  Tap to sign in
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
