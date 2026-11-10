import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { useSession } from "../context/SessionContext";
import { Screen } from "../components/Screen";
import { MapStore, StaffRouteMap } from "../components/StaffRouteMap";

type StaffMapStore = MapStore & {
  sort_order?: number;
};

export default function StaffMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ route_id?: string; name?: string }>();
  const { session, ready } = useSession();
  const routeId = session?.route_id ?? Number(params.route_id);
  const routeName = session?.route_name ?? params.name ?? "This route";
  const [stores, setStores] = useState<StaffMapStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    if (!routeId || Number.isNaN(routeId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/stores/${routeId}?include_inactive=true`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setError("Could not load stores for this route.");
        setStores([]);
        return;
      }
      setStores(
        data
          .map((store: StaffMapStore) => ({
            ...store,
            id: Number(store.id),
            latitude: store.latitude == null ? null : Number(store.latitude),
            longitude: store.longitude == null ? null : Number(store.longitude),
            entered_today: Boolean(store.entered_today),
            sort_order: Number(store.sort_order ?? 0),
          }))
          .sort((a: StaffMapStore, b: StaffMapStore) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      );
    } catch {
      setError("No connection to the server.");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    if (ready && !session) router.replace("/staff");
  }, [ready, session, router]);

  useFocusEffect(
    useCallback(() => {
      if (ready && session) void loadStores();
    }, [ready, session, loadStores])
  );

  const nextStore = useMemo(
    () => stores.find((store) => store.is_active !== false && !store.entered_today) ?? null,
    [stores]
  );

  if (!ready || !session) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "right", "left", "bottom"]}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text style={screenStyles.backLink}>← Stores</Text>
          </TouchableOpacity>
          <Text style={[screenStyles.title, { fontSize: 22, marginBottom: 2 }]}>Route map</Text>
          <Text style={styles.routeName}>{routeName}</Text>
          {nextStore ? (
            <Text style={styles.nextText}>Next: {nextStore.name}</Text>
          ) : (
            <Text style={styles.completeText}>All active stores completed today</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.muted}>Loading route stores…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={loadStores} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <StaffRouteMap stores={stores} nextStoreId={nextStore?.id ?? null} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = {
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.background,
    zIndex: 2,
  },
  routeName: {
    color: COLORS.textDisabled,
    fontSize: 13,
  },
  nextText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: 6,
  },
  completeText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: 6,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  muted: {
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  error: {
    color: COLORS.error,
    textAlign: "center" as const,
  },
  retryButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
};
