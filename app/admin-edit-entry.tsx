import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";
import DatePickerField from "../components/DatePickerField";

type RouteItem = { id: number; route_code: number | null; name: string };

type EntryRow = {
  id: number;
  date: string | null;
  created_at: string | null;
  store_id: number;
  store_name: string;
  route_id: number;
  route_code: number | null;
  route_name: string;
  delivered: number;
  returned: number;
  total_amount: number;
  collected_cash: number;
  collected_upi: number;
  amount_collected: number;
  balance: number;
  payment_mode: string | null;
  upi_received: boolean;
  is_closed: boolean;
};

type StoreItem = { id: number; name: string };

export default function AdminEditEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry_id?: string }>();
  const { adminSecret, isAdmin, ready } = useAdminAuth();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [searchDateObj, setSearchDateObj] = useState(() => new Date());
  const searchDate = searchDateObj.toISOString().slice(0, 10);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [editEntry, setEditEntry] = useState<EntryRow | null>(null);
  const [delivered, setDelivered] = useState("");
  const [returned, setReturned] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [upiReceived, setUpiReceived] = useState(false);
  const [markClosed, setMarkClosed] = useState(false);
  const [saving, setSaving] = useState(false);

  type AuditRow = {
    id: number;
    field: string;
    old_value: string;
    new_value: string;
    edited_by: string;
    edited_at: string | null;
  };
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  useFocusEffect(
    useCallback(() => {
      if (!ready || !isAdmin || !adminSecret) return;
      fetch(`${API_BASE}/admin/routes`, {
        headers: adminSecretHeaders(adminSecret),
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRoutes(data);
        })
        .catch(() => {});
    }, [ready, isAdmin, adminSecret])
  );

  useEffect(() => {
    if (selectedRoute == null) {
      setStores([]);
      setSelectedStore(null);
      return;
    }
    fetch(`${API_BASE}/stores/${selectedRoute}?include_inactive=true`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStores(data.map((s: any) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => setStores([]));
  }, [selectedRoute]);

  useEffect(() => {
    const raw = Array.isArray(params.entry_id) ? params.entry_id[0] : params.entry_id;
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0 && adminSecret) {
      fetch(`${API_BASE}/admin/entries/${n}`, {
        headers: adminSecretHeaders(adminSecret),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setEntries([data]);
            setHasSearched(true);
            openEdit(data);
          }
        })
        .catch(() => {});
    }
  }, [params.entry_id, adminSecret]);

  const search = async () => {
    if (!adminSecret) return;
    setSearching(true);
    setHasSearched(true);
    setEditEntry(null);
    try {
      const qs = new URLSearchParams();
      if (selectedRoute != null) qs.set("route_id", String(selectedRoute));
      if (selectedStore != null) qs.set("store_id", String(selectedStore));
      if (searchDate.trim()) qs.set("entry_date", searchDate.trim());
      const res = await fetch(`${API_BASE}/admin/entries?${qs}`, {
        headers: adminSecretHeaders(adminSecret),
      });
      const data = await res.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch {
      Alert.alert("Error", "Could not load entries.");
    } finally {
      setSearching(false);
    }
  };

  const openEdit = (row: EntryRow) => {
    setEditEntry(row);
    setMarkClosed(row.is_closed);
    if (row.is_closed) {
      setDelivered("0");
      setReturned("0");
      setCashAmount("0");
      setUpiAmount("0");
      setUpiReceived(false);
    } else {
      setDelivered(String(row.delivered ?? 0));
      setReturned(String(row.returned ?? 0));
      setCashAmount(String(row.collected_cash ?? 0));
      setUpiAmount(String(row.collected_upi ?? 0));
      setUpiReceived(row.upi_received);
    }
    setAuditLog([]);
    if (adminSecret) {
      fetch(`${API_BASE}/admin/entries/${row.id}/audit`, {
        headers: adminSecretHeaders(adminSecret),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.audit) setAuditLog(data.audit);
        })
        .catch(() => {});
    }
  };

  const handleSave = async () => {
    if (!editEntry || !adminSecret) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (markClosed) {
        body.is_closed = true;
      } else {
        body.is_closed = false;
        body.delivered = Number(delivered) || 0;
        body.returned = Number(returned) || 0;
        body.collected_cash = Number(cashAmount) || 0;
        body.collected_upi = Number(upiAmount) || 0;
        body.upi_received = upiReceived;
      }
      const res = await fetch(`${API_BASE}/admin/entries/${editEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...adminSecretHeaders(adminSecret),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Could not save", typeof data.detail === "string" ? data.detail : "Try again.");
        return;
      }
      Alert.alert("Saved", "Entry updated successfully.");
      setEditEntry(null);
      await search();
    } catch {
      Alert.alert("Error", "Network problem.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editEntry || !adminSecret) return;
    Alert.alert(
      "Delete entry?",
      `This will permanently remove entry #${editEntry.id} (${editEntry.store_name}, ${editEntry.date}). This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const res = await fetch(`${API_BASE}/admin/entries/${editEntry.id}`, {
                method: "DELETE",
                headers: adminSecretHeaders(adminSecret),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                Alert.alert("Error", typeof data.detail === "string" ? data.detail : "Could not delete.");
                return;
              }
              Alert.alert("Deleted", "Entry removed.");
              setEditEntry(null);
              await search();
            } catch {
              Alert.alert("Error", "Network problem.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const label = { color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" as const };
  const inputStyle = [screenStyles.input, { marginBottom: 14, backgroundColor: COLORS.card }];

  if (!ready || !isAdmin) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (editEntry) {
    return (
      <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
        <TouchableOpacity onPress={() => setEditEntry(null)} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Back to results</Text>
        </TouchableOpacity>

        <Text style={screenStyles.title}>Edit entry</Text>
        <View style={[screenStyles.card, { marginBottom: 16 }]}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 16, marginBottom: 4 }}>
            {editEntry.store_name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
            Entry #{editEntry.id} · {editEntry.date} · Route: {editEntry.route_name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>
            Original: {editEntry.delivered} del · {editEntry.returned} ret · ₹{editEntry.total_amount.toFixed(0)} bill · ₹{(editEntry.collected_cash + editEntry.collected_upi).toFixed(0)} paid
          </Text>
        </View>

        <Text style={screenStyles.sectionLabel}>Status</Text>
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setMarkClosed(false)}
            style={{
              flex: 1,
              marginRight: 8,
              paddingVertical: 14,
              backgroundColor: !markClosed ? COLORS.primary : COLORS.border,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: !markClosed ? "#FFFFFF" : COLORS.textPrimary }}>Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMarkClosed(true)}
            style={{
              flex: 1,
              paddingVertical: 14,
              backgroundColor: markClosed ? COLORS.error : COLORS.border,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: markClosed ? "#FFFFFF" : COLORS.textPrimary }}>Closed</Text>
          </TouchableOpacity>
        </View>

        {!markClosed && (
          <>
            <Text style={label}>Units delivered</Text>
            <TextInput
              value={delivered}
              onChangeText={setDelivered}
              placeholder="0"
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              style={inputStyle}
              editable={!saving}
            />

            <Text style={label}>Units returned</Text>
            <TextInput
              value={returned}
              onChangeText={setReturned}
              placeholder="0"
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              style={inputStyle}
              editable={!saving}
            />

            <Text style={label}>Cash collected (₹)</Text>
            <TextInput
              value={cashAmount}
              onChangeText={setCashAmount}
              placeholder="0"
              placeholderTextColor={placeholderColor}
              keyboardType="decimal-pad"
              style={inputStyle}
              editable={!saving}
            />

            <View
              style={{
                marginBottom: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: COLORS.card,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" }}>UPI received</Text>
                <Switch
                  value={upiReceived}
                  onValueChange={setUpiReceived}
                  trackColor={{ false: "#767577", true: COLORS.primaryPressed }}
                  thumbColor={upiReceived ? "#FFFFFF" : "#f4f3f4"}
                />
              </View>
            </View>

            <Text style={label}>UPI collected (₹)</Text>
            <TextInput
              value={upiAmount}
              onChangeText={setUpiAmount}
              placeholder="0"
              placeholderTextColor={placeholderColor}
              keyboardType="decimal-pad"
              style={inputStyle}
              editable={!saving}
            />

            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 14 }}>
              Total collected: ₹{((Number(cashAmount) || 0) + (Number(upiAmount) || 0)).toFixed(0)}
            </Text>
          </>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[screenStyles.primaryBtn, { marginBottom: 10 }, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={screenStyles.primaryBtnText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={saving}
          style={{ marginTop: 8, padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: COLORS.error, fontWeight: "700", fontSize: 16 }}>Delete entry</Text>
        </TouchableOpacity>

        {auditLog.length > 0 && (
          <View style={[screenStyles.card, { marginTop: 16, marginBottom: 32 }]}>
            <Text style={[screenStyles.sectionLabel, { marginBottom: 10 }]}>
              Edit history ({auditLog.length})
            </Text>
            {auditLog.map((row) => {
              const time = row.edited_at
                ? new Date(row.edited_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";
              return (
                <View
                  key={row.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ color: COLORS.textPrimary, fontWeight: "600", fontSize: 13 }}>
                      {row.field}
                    </Text>
                    <Text
                      style={{
                        color: row.edited_by === "admin" ? COLORS.warning : COLORS.primary,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {row.edited_by}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                    {row.old_value} → {row.new_value}
                  </Text>
                  <Text style={{ color: COLORS.textDisabled, fontSize: 11, marginTop: 2 }}>
                    {time}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        {auditLog.length === 0 && (
          <Text style={{ color: COLORS.textDisabled, fontSize: 12, textAlign: "center", marginTop: 16, marginBottom: 32 }}>
            No edit history for this entry.
          </Text>
        )}
      </Screen>
    );
  }

  const selectedRouteName = routes.find((r) => r.id === selectedRoute);
  const selectedStoreName = stores.find((s) => s.id === selectedStore);

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Edit sales entries</Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 12 }]}>
        Search by route, store, and date, then tap an entry to edit.
      </Text>

      {/* Route selector */}
      <Text style={label}>Route</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => { setSelectedRoute(null); setSelectedStore(null); }}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: selectedRoute == null ? COLORS.primary : COLORS.card,
            borderWidth: 1,
            borderColor: selectedRoute == null ? COLORS.primary : COLORS.border,
            marginRight: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: selectedRoute == null ? "#FFF" : COLORS.textPrimary }}>
            All routes
          </Text>
        </TouchableOpacity>
        {routes.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => { setSelectedRoute(r.id); setSelectedStore(null); }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: selectedRoute === r.id ? COLORS.primary : COLORS.card,
              borderWidth: 1,
              borderColor: selectedRoute === r.id ? COLORS.primary : COLORS.border,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: selectedRoute === r.id ? "#FFF" : COLORS.textPrimary }}>
              R{r.route_code} – {r.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Store selector — vertical list inside a card */}
      {selectedRoute != null && stores.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={label}>Store (optional)</Text>
          <View
            style={[
              screenStyles.card,
              { padding: 0, maxHeight: 220, overflow: "hidden" },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              <TouchableOpacity
                onPress={() => setSelectedStore(null)}
                style={{
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  backgroundColor: selectedStore == null ? "rgba(46,204,113,0.12)" : "transparent",
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: selectedStore == null ? "700" : "500", color: COLORS.textPrimary }}>
                  All stores
                </Text>
                {selectedStore == null && (
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "700" }}>✓</Text>
                )}
              </TouchableOpacity>
              {stores.map((s, idx) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSelectedStore(s.id)}
                  style={{
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    backgroundColor: selectedStore === s.id ? "rgba(46,204,113,0.12)" : "transparent",
                    borderBottomWidth: idx < stores.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: selectedStore === s.id ? "700" : "500",
                      color: COLORS.textPrimary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                  {selectedStore === s.id && (
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "700", marginLeft: 8 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {selectedStoreName && (
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "600", marginTop: 6 }}>
              Selected: {selectedStoreName.name}
            </Text>
          )}
        </View>
      )}

      <DatePickerField
        label="Date"
        value={searchDateObj}
        onChange={setSearchDateObj}
        disabled={searching}
      />

      <TouchableOpacity
        onPress={() => { Keyboard.dismiss(); search(); }}
        disabled={searching}
        style={[screenStyles.primaryBtn, { marginBottom: 16 }, searching && { opacity: 0.6 }]}
      >
        {searching ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.primaryBtnText}>Search entries</Text>
        )}
      </TouchableOpacity>

      {/* Results */}
      {hasSearched && entries.length === 0 && (
        <Text style={{ color: COLORS.textDisabled, textAlign: "center", marginTop: 24, marginBottom: 24 }}>
          No entries found for the selected filters.
        </Text>
      )}

      {hasSearched && entries.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={[screenStyles.sectionLabel, { marginBottom: 10 }]}>
            Results ({entries.length})
          </Text>
          {entries.map((item) => {
            const paid = (item.collected_cash + item.collected_upi).toFixed(0);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => openEdit(item)}
                style={[screenStyles.card, { marginBottom: 10, padding: 14 }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 15, flex: 1 }}>
                    {item.store_name}
                  </Text>
                  <Text style={{ color: COLORS.textDisabled, fontSize: 12 }}>#{item.id}</Text>
                </View>
                {item.is_closed ? (
                  <Text style={{ color: COLORS.error, fontSize: 13, marginTop: 4, fontWeight: "600" }}>
                    Closed (no sale)
                  </Text>
                ) : (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>
                    {item.delivered} del · {item.returned} ret · ₹{item.total_amount.toFixed(0)} bill · ₹{paid} paid · bal ₹{item.balance.toFixed(0)}
                  </Text>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: COLORS.textDisabled, fontSize: 12 }}>
                    {item.date} · R{item.route_code ?? item.route_id}
                  </Text>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "600" }}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
