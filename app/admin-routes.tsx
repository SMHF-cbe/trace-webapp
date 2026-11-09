import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { DraggableStoreList } from "../components/DraggableStoreList";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";

type RouteRow = { id: number; route_code: number; name: string };

type StoreRow = { id: number; name: string; price: number; is_active: boolean; sort_order?: number };

function normalizeRouteRow(r: { id: number; name: string; route_code?: number | null }): RouteRow {
  const id = Number(r.id);
  const code = r.route_code != null && !Number.isNaN(Number(r.route_code)) ? Number(r.route_code) : id;
  return { id, route_code: code, name: String(r.name ?? "") };
}

export default function AdminRoutesScreen() {
  const router = useRouter();
  const { adminSecret, isAdmin, ready } = useAdminAuth();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [expandedStores, setExpandedStores] = useState<StoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesSaving, setStoresSaving] = useState(false);

  const load = useCallback(async () => {
    if (!adminSecret) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/routes`, {
        headers: adminSecretHeaders(adminSecret),
        cache: "no-store",
      });
      if (!res.ok) {
        setRoutes([]);
        return;
      }
      const data = await res.json();
      setRoutes(
        Array.isArray(data)
          ? data.map((row: { id: number; name: string; route_code?: number | null }) => normalizeRouteRow(row))
          : []
      );
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  const loadStoresForRoute = useCallback(async (internalRouteId: number) => {
    setStoresLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stores/${internalRouteId}?include_inactive=true`, { cache: "no-store" });
      if (!res.ok) {
        setExpandedStores([]);
        return;
      }
      const data = await res.json();
      setExpandedStores(Array.isArray(data) ? data : []);
    } catch {
      setExpandedStores([]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const toggleStores = useCallback(
    (item: RouteRow) => {
      if (expandedRouteId === item.id) {
        setExpandedRouteId(null);
        setExpandedStores([]);
        return;
      }
      setExpandedRouteId(item.id);
      void loadStoresForRoute(item.id);
    },
    [expandedRouteId, loadStoresForRoute]
  );

  const reorderStores = useCallback(
    async (nextStores: StoreRow[]) => {
      if (!adminSecret || expandedRouteId == null) return;
      const previous = expandedStores;
      setExpandedStores(nextStores);
      setStoresSaving(true);
      try {
        const res = await fetch(`${API_BASE}/admin/stores/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...adminSecretHeaders(adminSecret) },
          body: JSON.stringify({
            route_id: expandedRouteId,
            stores: nextStores.map((store, index) => ({ id: store.id, sort_order: index })),
          }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          setExpandedStores(previous);
          Alert.alert("Could not reorder", typeof detail.detail === "string" ? detail.detail : "Try again.");
        }
      } catch {
        setExpandedStores(previous);
        Alert.alert("Could not reorder", "Network problem. The previous order was restored.");
      } finally {
        setStoresSaving(false);
      }
    },
    [adminSecret, expandedRouteId, expandedStores]
  );

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      if (!isAdmin) {
        router.replace("/admin-login");
        return;
      }
      void load();
    }, [ready, isAdmin, load, router])
  );

  useFocusEffect(
    useCallback(() => {
      if (expandedRouteId != null) void loadStoresForRoute(expandedRouteId);
    }, [expandedRouteId, loadStoresForRoute])
  );

  const removeRoute = (item: RouteRow) => {
    Alert.alert(
      "Delete route?",
      `Remove "${item.name}" and all its stores and entries? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/admin/routes/${item.id}`, {
                method: "DELETE",
                headers: adminSecretHeaders(adminSecret),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                Alert.alert("Error", typeof j.detail === "string" ? j.detail : "Could not delete");
                return;
              }
              if (expandedRouteId === item.id) {
                setExpandedRouteId(null);
                setExpandedStores([]);
              }
              await load();
            } catch {
              Alert.alert("Error", "Network problem");
            }
          },
        },
      ]
    );
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
    <Screen edges={["top", "right", "left", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Back</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>Manage routes</Text>
        <Text style={[screenStyles.subtitle, { marginBottom: 12 }]}>
          Tap a route name to list stores (edit offers, price, delete). Use Edit for route ID, name, or PIN.
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={routes}
            keyExtractor={(r) => String(r.id)}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <Text style={{ color: COLORS.textSecondary, marginTop: 16 }}>No routes yet.</Text>
            }
            renderItem={({ item }) => {
              const open = expandedRouteId === item.id;
              return (
                <View style={[screenStyles.card, styles.routeCard]}>
                  <View style={styles.routeHeaderRow}>
                    <TouchableOpacity
                      onPress={() => toggleStores(item)}
                      activeOpacity={0.75}
                      style={styles.routeNameTap}
                      accessibilityRole="button"
                      accessibilityLabel={`${open ? "Hide" : "Show"} stores for route ${item.name}`}
                    >
                      <Text style={styles.routeTitle}>
                        Route {item.route_code ?? item.id} – {item.name}
                      </Text>
                      <Text style={styles.routeTapHint}>
                        {open ? "▲ Hide stores" : "▼ Tap for stores · add · CRUD"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/admin-route-edit",
                          params: {
                            route_id: String(item.id),
                            route_code: String(item.route_code ?? item.id),
                            name: item.name,
                          },
                        })
                      }
                      style={{ paddingVertical: 8, paddingHorizontal: 10, marginRight: 2 }}
                    >
                      <Text style={{ color: COLORS.primary, fontWeight: "700" }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeRoute(item)} style={{ paddingVertical: 8, paddingHorizontal: 6 }}>
                      <Text style={{ color: COLORS.error, fontWeight: "700" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  {open ? (
                    <View style={styles.storesBlock}>
                      {storesLoading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
                      ) : expandedStores.length === 0 ? (
                        <Text style={styles.storesEmpty}>No stores on this route yet.</Text>
                      ) : (
                        <>
                          <DraggableStoreList
                            stores={expandedStores}
                            saving={storesSaving}
                            onReorder={reorderStores}
                            onOpenStore={(s) =>
                              router.push({
                                pathname: "/admin-store-edit",
                                params: { store_id: String(s.id), route_id: String(item.id) },
                              })
                            }
                          />
                        </>
                      )}
                      <TouchableOpacity
                        onPress={() =>
                          router.push({ pathname: "/add-store", params: { route_id: String(item.id) } })
                        }
                        style={[screenStyles.secondaryBtn, { marginTop: 8 }]}
                      >
                        <Text style={screenStyles.secondaryBtnText}>Add store</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    marginBottom: 10,
    padding: 14,
  },
  routeHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeNameTap: {
    flex: 1,
    marginRight: 4,
    minWidth: 0,
  },
  routeTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  routeTapHint: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  storesBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  storesEmpty: {
    color: COLORS.textDisabled,
    fontSize: 14,
    marginBottom: 8,
  },
});
