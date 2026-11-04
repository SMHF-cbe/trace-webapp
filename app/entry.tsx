import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "../constants/colors";
import {
  outstandingDueColor,
  shouldWarnHighOutstanding,
} from "../constants/outstandingThresholds";
import { API_BASE, mediaUrl } from "../constants/config";
import { screenStyles, placeholderColor } from "../constants/screenStyles";
import { Screen } from "../components/Screen";

type StoreInfo = {
  name: string;
  is_active: boolean;
  photo_url: string | null;
  price: number;
  offer_type: string;
  offer_buy: number;
  offer_get: number;
  offer_min_qty: number;
  bundle_price: number;
  area: string | null;
  notes: string | null;
  opening_balance?: number;
};

type TodayEntry = {
  id: number;
  created_at: string | null;
  delivered: number;
  returned: number;
  collected_cash: number;
  collected_upi: number;
  total_amount: number;
  balance: number;
  payment_mode: string | null;
  upi_received: boolean;
  is_closed: boolean;
  editable?: boolean;
  edit_remaining_sec?: number;
};

export default function EntryScreen() {
  const router = useRouter();
  const { store_id, route_id, name, entry_id: entryIdParam } = useLocalSearchParams();

  const [delivered, setDelivered] = useState("");
  const [returned, setReturned] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [upiReceived, setUpiReceived] = useState(false);

  const [isClosed, setIsClosed] = useState(false);
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [storeInfoLoading, setStoreInfoLoading] = useState(true);
  const highBalanceWarnedRef = useRef(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const hasEditable = todayEntries.some((e) => e.editable && (e.edit_remaining_sec ?? 0) > 0);
    if (!hasEditable) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [todayEntries]);

  const clearForm = useCallback(() => {
    setDelivered("");
    setReturned("");
    setCashAmount("");
    setUpiAmount("");
    setUpiReceived(false);
    setIsClosed(false);
  }, []);

  const fillFromEntry = useCallback((row: TodayEntry) => {
    if (row.is_closed) {
      setIsClosed(true);
      return;
    }
    setIsClosed(false);
    setDelivered(row.delivered != null ? String(row.delivered) : "");
    setReturned(row.returned != null ? String(row.returned) : "");
    setCashAmount(row.collected_cash != null ? String(row.collected_cash) : "");
    setUpiAmount(row.collected_upi != null ? String(row.collected_upi) : "");
    setUpiReceived(Boolean(row.upi_received));
  }, []);

  const loadTodayEntries = useCallback(async (): Promise<TodayEntry[]> => {
    if (!store_id) return [];
    try {
      const res = await fetch(`${API_BASE}/entries/today/${store_id}`);
      const data = await res.json();
      const list: TodayEntry[] = Array.isArray(data?.entries) ? data.entries : [];
      setTodayEntries(list);
      return list;
    } catch {
      setTodayEntries([]);
      return [];
    }
  }, [store_id]);

  useEffect(() => {
    const raw = Array.isArray(entryIdParam) ? entryIdParam[0] : entryIdParam;
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) {
      setEditingEntryId(n);
    }
  }, [entryIdParam]);

  const refreshStoreAndSnapshot = useCallback(() => {
    if (!store_id) return;
    setStoreInfoLoading(true);
    fetch(`${API_BASE}/store/${store_id}/snapshot`)
      .then((res) => res.json())
      .then(setSnapshot)
      .catch(() => {});
    fetch(`${API_BASE}/store/${store_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) setStoreInfo(data);
        else setStoreInfo(null);
      })
      .catch(() => setStoreInfo(null))
      .finally(() => setStoreInfoLoading(false));
  }, [store_id]);

  useFocusEffect(
    useCallback(() => {
      if (!route_id || !store_id) return;
      highBalanceWarnedRef.current = false;
      refreshStoreAndSnapshot();
    }, [route_id, store_id, refreshStoreAndSnapshot])
  );

  useEffect(() => {
    if (!snapshot || !store_id) return;
    const out = Number(snapshot.outstanding ?? 0);
    if (!shouldWarnHighOutstanding(out) || highBalanceWarnedRef.current) return;
    highBalanceWarnedRef.current = true;
    Alert.alert(
      "High outstanding balance",
      `This store owes ₹${out.toFixed(2)} (above ₹1,500). Confirm payment before adding more credit or stock.`,
      [{ text: "OK" }]
    );
  }, [snapshot, store_id]);

  useEffect(() => {
    if (!store_id) return;
    loadTodayEntries().then((list) => {
      if (editingEntryId == null) return;
      const row = list.find((e) => e.id === editingEntryId);
      if (row) fillFromEntry(row);
    });
  }, [store_id, editingEntryId, loadTodayEntries, fillFromEntry]);

  const handleSubmit = async () => {
    const cc = Number(cashAmount) || 0;
    const cu = Number(upiAmount) || 0;
    if (!isClosed && cu > 0 && !upiReceived) {
      Alert.alert(
        "Turn on UPI received",
        "Switch on “UPI received” when the UPI amount shows in your account, or set UPI to 0 if it is still pending."
      );
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        store_id: Number(store_id),
        route_id: Number(route_id),
        delivered: Number(delivered) || 0,
        returned: Number(returned) || 0,
        amount_collected: 0,
        collected_cash: cc,
        collected_upi: cu,
        payment_mode: "cash",
        upi_received: upiReceived,
        is_closed: isClosed,
      };
      if (editingEntryId != null && !isClosed) {
        payload.entry_id = editingEntryId;
      }

      const res = await fetch(`${API_BASE}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          "Could not save",
          typeof data.detail === "string" ? data.detail : "Please check numbers and try again."
        );
        return;
      }

      if (isClosed) {
        Alert.alert("Saved", data.warning ? String(data.warning) : "Marked as closed for today.");
        await loadTodayEntries();
        fetch(`${API_BASE}/store/${store_id}/snapshot`)
          .then((r) => r.json())
          .then(setSnapshot);
        router.back();
        return;
      }

      Alert.alert(
        "Saved",
        `Total: ₹${data.total}\nCollected: ₹${data.collected}\nBalance: ₹${data.balance}` +
          (data.warning ? `\n\n${data.warning}` : "")
      );

      router.back();
    } catch {
      Alert.alert("Error", "Network problem. Check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { color: "#FFFFFF", marginBottom: 6, fontSize: 14, fontWeight: "500" as const };
  const inputRow = [screenStyles.input, { marginBottom: 14, backgroundColor: "#FFFFFF" }];

  const img = storeInfo ? mediaUrl(storeInfo.photo_url) : null;
  const isInactiveStore = storeInfo?.is_active === false;
  const blockSaleWhileInactive = isInactiveStore && !isClosed;

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back to stores</Text>
      </TouchableOpacity>

      <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 4 }}>
        {name}
      </Text>
      <Text style={[screenStyles.subtitle, { marginBottom: 12 }]}>
        You can save several visits per day — each save adds a new entry unless you edit one below. Use &quot;Closed&quot;
        if the shop is shut.
      </Text>

      {isInactiveStore && (
        <View style={[screenStyles.card, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.4)" }]}>
          <Text style={{ color: "#FCA5A5", lineHeight: 20 }}>
            This store is inactive. Turn it on in store info, or set status to &quot;Closed&quot; below to save a
            no-sale day.
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/store-info",
                params: { store_id: String(store_id), route_id: String(route_id) },
              })
            }
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Open store details</Text>
          </TouchableOpacity>
        </View>
      )}

      {storeInfo && (
        <View style={screenStyles.card}>
          <Text style={screenStyles.sectionLabel}>Store info</Text>
          {img ? (
            <Image
              source={{ uri: img }}
              style={{ width: "100%", height: 140, borderRadius: 10, marginBottom: 10, backgroundColor: COLORS.border }}
              contentFit="cover"
            />
          ) : null}
          <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
            ₹{storeInfo.price} / unit · Offer: {storeInfo.offer_type || "none"}
          </Text>
          {storeInfo.area ? (
            <Text style={{ color: COLORS.textSecondary, marginBottom: 4 }}>Area: {storeInfo.area}</Text>
          ) : null}
          {storeInfo.notes ? (
            <Text style={{ color: COLORS.textSecondary, marginBottom: 8 }}>Notes: {storeInfo.notes}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/store-info",
                params: { store_id: String(store_id), route_id: String(route_id) },
              })
            }
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>Full details & map</Text>
          </TouchableOpacity>
        </View>
      )}

      {todayEntries.length > 0 && (
        <View style={[screenStyles.card, { marginBottom: 12 }]}>
          <Text style={screenStyles.sectionLabel}>Today&apos;s visits ({todayEntries.length})</Text>
          {todayEntries.map((item) => {
            const timeLabel = item.created_at
              ? new Date(item.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
              : `#${item.id}`;

            let liveRemaining = 0;
            if (item.created_at && !item.is_closed) {
              const createdMs = new Date(item.created_at).getTime();
              const elapsedSec = (Date.now() - createdMs) / 1000;
              liveRemaining = Math.max(0, Math.round(15 * 60 - elapsedSec));
            }
            const canEdit = !item.is_closed && liveRemaining > 0;
            const mins = Math.floor(liveRemaining / 60);
            const secs = liveRemaining % 60;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  if (item.is_closed) {
                    setIsClosed(true);
                    setEditingEntryId(null);
                    return;
                  }
                  if (!canEdit) {
                    Alert.alert(
                      "Editing locked",
                      "This entry can no longer be edited. Contact admin if it needs correction."
                    );
                    return;
                  }
                  setEditingEntryId(item.id);
                  fillFromEntry(item);
                }}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 }}>
                  {item.is_closed
                    ? "Closed"
                    : `${timeLabel} · ${item.delivered} del · ₹${Number(item.total_amount).toFixed(0)} bill · paid ₹${(Number(item.collected_cash) + Number(item.collected_upi)).toFixed(0)}`}
                </Text>
                {!item.is_closed && canEdit && (
                  <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 4 }}>
                    Edit · {mins}:{String(secs).padStart(2, "0")} left
                  </Text>
                )}
                {!item.is_closed && !canEdit && (
                  <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 4 }}>
                    Locked — contact admin to edit
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => {
              setEditingEntryId(null);
              clearForm();
            }}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "700" }}>+ New visit (blank form)</Text>
          </TouchableOpacity>
        </View>
      )}

      {editingEntryId != null && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: "#FCD34D", fontSize: 13 }}>
            Editing visit #{editingEntryId} — Save updates this row only.
          </Text>
        </View>
      )}

      {snapshot && (
        <View style={screenStyles.card}>
          <Text style={screenStyles.sectionLabel}>Quick info</Text>
          <Text
            style={{
              color:
                outstandingDueColor(Number(snapshot.outstanding ?? 0)) ?? COLORS.textPrimary,
              marginBottom: 4,
              fontWeight: "700",
            }}
          >
            Outstanding balance: ₹{Number(snapshot.outstanding).toFixed(2)}
          </Text>
          {Number(snapshot.opening_balance) > 0.005 ? (
            <Text style={{ color: COLORS.textSecondary, marginBottom: 4, fontSize: 13 }}>
              Includes opening balance: ₹{Number(snapshot.opening_balance).toFixed(2)}
            </Text>
          ) : null}
          <Text style={{ color: COLORS.textSecondary, marginBottom: 4 }}>
            Yesterday: {snapshot.yesterday_packets} units delivered
          </Text>
          <Text style={{ color: COLORS.textSecondary }}>
            Last payment recorded: ₹{snapshot.last_payment}
          </Text>
        </View>
      )}

      <Text style={screenStyles.sectionLabel}>Shop status</Text>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setIsClosed(false)}
          style={{
            flex: 1,
            marginRight: 8,
            paddingVertical: 14,
            backgroundColor: !isClosed ? COLORS.primary : COLORS.border,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "600", color: !isClosed ? "#FFFFFF" : COLORS.textPrimary }}>
            Open
          </Text>
          <Text style={{ fontSize: 12, marginTop: 4, color: !isClosed ? "rgba(255,255,255,0.85)" : COLORS.textSecondary }}>
            Normal sale
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsClosed(true)}
          style={{
            flex: 1,
            paddingVertical: 14,
            backgroundColor: isClosed ? COLORS.error : COLORS.border,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "600", color: isClosed ? "#FFFFFF" : COLORS.textPrimary }}>
            Closed
          </Text>
          <Text style={{ fontSize: 12, marginTop: 4, color: isClosed ? "rgba(255,255,255,0.9)" : COLORS.textSecondary }}>
            No sale today
          </Text>
        </TouchableOpacity>
      </View>

      {!isClosed && (
        <>
          <Text style={labelStyle}>Units delivered</Text>
          <TextInput
            value={delivered}
            onChangeText={setDelivered}
            placeholder="0"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!blockSaleWhileInactive}
            style={[...inputRow, blockSaleWhileInactive && { opacity: 0.55 }]}
          />

          <Text style={labelStyle}>Units returned</Text>
          <TextInput
            value={returned}
            onChangeText={setReturned}
            placeholder="0"
            placeholderTextColor={placeholderColor}
            keyboardType="number-pad"
            editable={!blockSaleWhileInactive}
            style={[...inputRow, blockSaleWhileInactive && { opacity: 0.55 }]}
          />

          <Text style={screenStyles.sectionLabel}>Payments (this visit)</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 10, lineHeight: 18 }}>
            Use cash only, or turn on &quot;UPI received&quot; and enter UPI only — when UPI is on, cash is locked. For
            another delivery later, save first, then &quot;New visit&quot;.
          </Text>

          <Text style={labelStyle}>Cash collected (₹)</Text>
          {upiReceived && (
            <Text style={{ color: COLORS.warning, fontSize: 13, marginBottom: 8, lineHeight: 18 }}>
              Turn off &quot;UPI received&quot; below to enter cash.
            </Text>
          )}
          <TextInput
            value={cashAmount}
            onChangeText={setCashAmount}
            placeholder={upiReceived ? "—" : "0"}
            placeholderTextColor={placeholderColor}
            keyboardType="decimal-pad"
            editable={!upiReceived && !blockSaleWhileInactive}
            style={[...inputRow, upiReceived && { opacity: 0.55 }]}
          />

          <View
            style={{
              marginBottom: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>UPI received</Text>
                <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                  On only after the UPI amount shows in your account. Then enter the UPI amount below.
                </Text>
              </View>
              <Switch
                value={upiReceived}
                onValueChange={(v) => {
                  setUpiReceived(v);
                  if (!v) setUpiAmount("");
                  if (v) setCashAmount("");
                }}
                trackColor={{ false: "#767577", true: COLORS.primaryPressed }}
                thumbColor={upiReceived ? "#FFFFFF" : "#f4f3f4"}
                accessibilityLabel="UPI payment received in account"
              />
            </View>
          </View>

          <Text style={labelStyle}>UPI collected (₹)</Text>
          {!upiReceived && (
            <Text style={{ color: COLORS.warning, fontSize: 13, marginBottom: 8, lineHeight: 18 }}>
              Turn on &quot;UPI received&quot; to enter an amount here.
            </Text>
          )}
          <TextInput
            value={upiAmount}
            onChangeText={setUpiAmount}
            placeholder={upiReceived ? "0" : "Turn on UPI received first"}
            placeholderTextColor={placeholderColor}
            keyboardType="decimal-pad"
            editable={upiReceived && !blockSaleWhileInactive}
            style={[...inputRow, !upiReceived && { opacity: 0.55 }]}
          />

          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 14 }}>
            Total collected (this visit): ₹
            {((Number(cashAmount) || 0) + (Number(upiAmount) || 0)).toFixed(0)}
          </Text>
        </>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={saving || storeInfoLoading || !storeInfo || blockSaleWhileInactive}
        style={[
          screenStyles.primaryBtn,
          { marginBottom: 10 },
          (saving || storeInfoLoading || !storeInfo || blockSaleWhileInactive) && { opacity: 0.6 },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={screenStyles.primaryBtnText}>
            {editingEntryId != null ? "Save changes to this visit" : "Save new visit"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: "/ledger" as const, params: { store_id, name } })
        }
        style={[screenStyles.secondaryBtn, { marginBottom: 8 }]}
      >
        <Text style={screenStyles.secondaryBtnText}>View full ledger</Text>
      </TouchableOpacity>
    </Screen>
  );
}
