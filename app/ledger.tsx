import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { Screen } from "../components/Screen";
import DatePickerField from "../components/DatePickerField";

type LedgerItem = {
  id: number;
  date: string;
  created_at?: string | null;
  delivered: number;
  returned: number;
  packets_sold?: number;
  packets_returned?: number;
  debit?: number;
  credit?: number;
  bill_amount?: number;
  amount_paid?: number;
  collected?: number;
  payment_mode?: string;
  payment_label?: string;
  line_due?: number;
  balance?: number;
  balance_before?: number;
  balance_after?: number;
  running_balance: number;
  is_closed?: boolean;
};

type LedgerSummary = {
  total_outstanding: number;
  opening_balance: number;
  store_opening_balance?: number;
};

function parseLedgerResponse(json: unknown): { entries: LedgerItem[]; summary: LedgerSummary | null } {
  if (Array.isArray(json)) {
    return { entries: json as LedgerItem[], summary: null };
  }
  if (json && typeof json === "object" && "entries" in json) {
    const o = json as { entries?: LedgerItem[]; summary?: LedgerSummary };
    return {
      entries: Array.isArray(o.entries) ? o.entries : [],
      summary: o.summary ?? null,
    };
  }
  return { entries: [], summary: null };
}

function rupees(n: number): string {
  return `₹${Number(n).toFixed(0)}`;
}

export default function LedgerScreen() {
  const { store_id, name } = useLocalSearchParams();
  const router = useRouter();

  const [data, setData] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "custom">("all");
  const [loading, setLoading] = useState(true);

  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [customTo, setCustomTo] = useState(() => new Date());

  function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  const fetchLedger = useCallback(
    async (type: "all" | "today" | "week" | "custom" = "all", from?: Date, to?: Date) => {
      if (!store_id) return;
      setFilter(type);
      setLoading(true);
      try {
        let url = `${API_BASE}/ledger/${store_id}`;

        if (type === "today") {
          const today = new Date().toISOString().split("T")[0];
          url += `?from_date=${today}&to_date=${today}`;
        } else if (type === "week") {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          url += `?from_date=${d.toISOString().split("T")[0]}&to_date=${new Date().toISOString().split("T")[0]}`;
        } else if (type === "custom" && from && to) {
          url += `?from_date=${ymd(from)}&to_date=${ymd(to)}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok) {
          Alert.alert("Error", "Could not load ledger.");
          setData([]);
          setSummary(null);
          return;
        }

        const { entries, summary: sm } = parseLedgerResponse(json);
        setData(entries);
        setSummary(sm);
      } catch (err) {
        console.log(err);
        Alert.alert("Error", "Check connection.");
        setData([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [store_id]
  );

  useEffect(() => {
    fetchLedger("all");
  }, [fetchLedger]);

  const chip = (label: string, key: "all" | "today" | "week" | "custom") => {
    const active = filter === key;
    return (
      <TouchableOpacity
        onPress={() => {
          if (key === "custom") {
            setFilter("custom");
            fetchLedger("custom", customFrom, customTo);
          } else {
            fetchLedger(key);
          }
        }}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 20,
          backgroundColor: active ? COLORS.primary : COLORS.surface,
          borderWidth: 1,
          borderColor: active ? COLORS.primary : "rgba(255,255,255,0.15)",
          marginRight: 8,
        }}
      >
        <Text style={{ color: active ? "#FFFFFF" : COLORS.textDisabled, fontWeight: "600", fontSize: 13 }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const outstanding = summary?.total_outstanding ?? null;
  const lastRunning = data.length > 0 ? data[data.length - 1].running_balance : null;

  const cell = (label: string, value: string, valueColor?: string) => (
    <View style={{ flex: 1, minWidth: "30%", marginBottom: 8 }}>
      <Text style={{ color: COLORS.textDisabled, fontSize: 10, fontWeight: "600", marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: valueColor ?? COLORS.textPrimary, fontSize: 13, fontWeight: "700" }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  return (
    <Screen edges={["top", "right", "left", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={screenStyles.backLink}>← Back</Text>
        </TouchableOpacity>

        <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 4 }}>Ledger</Text>
        <Text style={{ color: COLORS.textDisabled, fontSize: 16, marginBottom: 8 }}>{name}</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
          Each visit shows <Text style={{ fontWeight: "700" }}>sales</Text> (packets sold & returned) and{" "}
          <Text style={{ fontWeight: "700" }}>money</Text> (bill, paid, balances). Returns are units only; amounts follow
          your saved entry.
        </Text>

        {outstanding !== null && (
          <View
            style={[
              screenStyles.card,
              {
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                borderColor: "rgba(34, 197, 94, 0.35)",
                marginBottom: 12,
              },
            ]}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 }}>
              Total outstanding (unpaid, all time)
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800" }}>₹{Number(outstanding).toFixed(2)}</Text>
            {summary && Number(summary.store_opening_balance) > 0.005 ? (
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 6 }}>
                Includes store opening balance: ₹{Number(summary.store_opening_balance).toFixed(2)}
              </Text>
            ) : null}
            {filter !== "all" && lastRunning != null && (
              <Text style={{ color: COLORS.warning, fontSize: 12, marginTop: 8 }}>
                In this filter, owed after last row: ₹{Number(lastRunning).toFixed(2)} (full history may differ).
              </Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: "row", marginBottom: 10, flexWrap: "wrap" }}>
          {chip("All history", "all")}
          {chip("Today", "today")}
          {chip("Last 7 days", "week")}
          {chip("Custom", "custom")}
        </View>

        {filter === "custom" && (
          <View style={{ marginBottom: 14 }}>
            <DatePickerField
              label="From"
              value={customFrom}
              onChange={(d) => {
                setCustomFrom(d);
                fetchLedger("custom", d, customTo);
              }}
            />
            <DatePickerField
              label="To"
              value={customTo}
              onChange={(d) => {
                setCustomTo(d);
                fetchLedger("custom", customFrom, d);
              }}
            />
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={data}
            style={{ flex: 1 }}
            keyExtractor={(item) => String(item.id ?? item.date)}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <Text style={{ color: COLORS.textSecondary, textAlign: "center", marginTop: 24 }}>
                No entries in this range.
              </Text>
            }
            renderItem={({ item }) => {
              const sold = item.packets_sold ?? item.delivered ?? 0;
              const ret = item.packets_returned ?? item.returned ?? 0;
              const bill = item.bill_amount ?? item.debit ?? 0;
              const paid = item.amount_paid ?? item.credit ?? item.collected ?? 0;
              const lineDue = item.line_due ?? item.balance ?? 0;
              const before = item.balance_before ?? Number(item.running_balance) - lineDue;
              const after = item.balance_after ?? item.running_balance;
              const payLine =
                item.payment_label ||
                (item.payment_mode && item.payment_mode !== "—" ? String(item.payment_mode) : "—");
              const timeStr =
                item.created_at && !item.is_closed
                  ? new Date(item.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

              if (item.is_closed) {
                const cBefore = item.balance_before ?? item.running_balance;
                const cAfter = item.balance_after ?? item.running_balance;
                return (
                  <View
                    style={{
                      backgroundColor: COLORS.card,
                      padding: 14,
                      marginBottom: 10,
                      borderRadius: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: COLORS.error,
                    }}
                  >
                    <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 15 }}>
                      {item.date}
                      {timeStr ? ` · ${timeStr}` : ""}
                    </Text>
                    <Text style={{ color: COLORS.error, fontWeight: "600", marginTop: 6 }}>Closed — no sale</Text>
                    <Text style={{ color: COLORS.textDisabled, fontSize: 11, marginTop: 6 }}>
                      Sales: 0 sold · 0 returns (no delivery recorded)
                    </Text>
                    <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 4 }}>
                      Old balance: {rupees(cBefore)} → Total owed after: {rupees(cAfter)} (unchanged)
                    </Text>
                  </View>
                );
              }

              return (
                <View
                  style={{
                    backgroundColor: COLORS.card,
                    padding: 14,
                    marginBottom: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                    <View>
                      <Text style={{ color: COLORS.textPrimary, fontWeight: "700", fontSize: 15 }}>{item.date}</Text>
                      {timeStr ? (
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>{timeStr}</Text>
                      ) : null}
                    </View>
                    <Text style={{ color: COLORS.textDisabled, fontSize: 11 }}>#{item.id}</Text>
                  </View>

                  <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
                    SALES (PACKETS)
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
                    {cell("Sold", String(sold))}
                    {cell("Returns", String(ret))}
                  </View>

                  <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
                    MONEY (₹)
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                    {cell("Bill (amount)", rupees(bill))}
                    {cell("Paid", rupees(paid))}
                    {cell("This visit due", rupees(lineDue), COLORS.warning)}
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginBottom: 10 }} numberOfLines={2}>
                    Payment: {payLine}
                  </Text>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: COLORS.border,
                      paddingTop: 10,
                      flexDirection: "row",
                      flexWrap: "wrap",
                    }}
                  >
                    {cell("Old balance (owed before)", rupees(before), COLORS.textSecondary)}
                    {cell("New from this visit (due)", rupees(lineDue), COLORS.warning)}
                    {cell("Total owed after", rupees(after), COLORS.success)}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
