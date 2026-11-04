import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";
import { API_BASE } from "../constants/config";
import { adminSecretHeaders } from "../context/AdminAuthContext";
import DatePickerField from "./DatePickerField";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - 40;

type Props = {
  adminSecret: string;
  routes: { id: number; route_code?: number | null; name: string }[];
};

type Summary = {
  total_delivered: number;
  total_returned: number;
  total_cash: number;
  total_upi: number;
  total_collected: number;
  total_balance: number;
  total_stores_visited: number;
  avg_sale_per_store: number;
};

type DailyRow = {
  date: string;
  delivered: number;
  returned: number;
  collected: number;
  balance: number;
};

type StoreRow = {
  store_id: number;
  store_name: string;
  route_id: number;
  route_code: number | null;
  delivered: number;
  returned: number;
  collected: number;
  balance: number;
  outstanding: number;
};

type StoreDailyRow = {
  store_id: number;
  store_name: string;
  date: string;
  delivered: number;
  returned: number;
  collected: number;
};

type DashData = {
  summary: Summary;
  daily: DailyRow[];
  stores: StoreRow[];
  store_daily: StoreDailyRow[];
};

const CHART_COLORS = [
  "#2ECC71", "#3498DB", "#E74C3C", "#F39C12", "#9B59B6",
  "#1ABC9C", "#E67E22", "#2980B9", "#C0392B", "#16A085",
];

function shortDate(iso: string): string {
  const parts = iso.split("-");
  return `${parts[2]}/${parts[1]}`;
}

function truncName(s: string, max = 10): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
  labelColor: () => COLORS.textSecondary,
  propsForDots: { r: "4", strokeWidth: "1", stroke: "#2ECC71" },
  propsForBackgroundLines: { stroke: "#E5E7EB", strokeDasharray: "" },
  barPercentage: 0.6,
};

const revenueChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
  propsForDots: { r: "4", strokeWidth: "1", stroke: "#3498DB" },
};

export default function AdminDashboard({ adminSecret, routes }: Props) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [toDate, setToDate] = useState(() => new Date());
  const [routeId, setRouteId] = useState<number | null>(null);
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareStores, setCompareStores] = useState<number[]>([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from_date: ymd(fromDate),
        to_date: ymd(toDate),
      });
      if (routeId != null) params.set("route_id", String(routeId));
      const res = await fetch(`${API_BASE}/admin/dashboard?${params}`, {
        headers: adminSecretHeaders(adminSecret),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        Alert.alert("Error", typeof j.detail === "string" ? j.detail : "Could not load dashboard");
        return;
      }
      const json: DashData = await res.json();
      setData(json);
      setCompareStores([]);
    } catch {
      Alert.alert("Error", "Network problem loading dashboard.");
    } finally {
      setLoading(false);
    }
  }, [adminSecret, fromDate, toDate, routeId]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const routeChips = useMemo(() => {
    const items: { id: number | null; label: string }[] = [
      { id: null, label: "All routes" },
    ];
    for (const r of routes) {
      items.push({ id: r.id, label: `R${r.route_code ?? r.id} ${r.name}` });
    }
    return items;
  }, [routes]);

  const dailyLabels = useMemo(
    () => (data?.daily ?? []).map((d) => shortDate(d.date)),
    [data]
  );
  const maxLabels = 8;
  const skipEvery = Math.max(1, Math.ceil(dailyLabels.length / maxLabels));

  const toggleCompareStore = (sid: number) => {
    setCompareStores((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : prev.length < 5 ? [...prev, sid] : prev
    );
  };

  const storeComparisonLineData = useMemo(() => {
    if (!data || compareStores.length === 0) return null;
    const dates = [...new Set(data.daily.map((d) => d.date))].sort();
    const labels = dates.map(shortDate);
    const datasets = compareStores.map((sid, i) => {
      const byDate = new Map<string, number>();
      for (const sd of data.store_daily) {
        if (sd.store_id === sid) byDate.set(sd.date, sd.delivered);
      }
      return {
        data: dates.map((dt) => byDate.get(dt) ?? 0),
        color: () => CHART_COLORS[i % CHART_COLORS.length],
        strokeWidth: 2,
      };
    });
    return { labels, datasets };
  }, [data, compareStores]);

  const sectionTitle = (title: string) => (
    <Text
      style={{
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {title}
    </Text>
  );

  const kpiCard = (label: string, value: string, color: string) => (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        margin: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Text style={{ color: COLORS.textDisabled, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ color, fontSize: 20, fontWeight: "800" }}>{value}</Text>
    </View>
  );

  return (
    <View>
      {/* Filters */}
      <DatePickerField label="From" value={fromDate} onChange={setFromDate} disabled={loading} />
      <DatePickerField label="To" value={toDate} onChange={setToDate} disabled={loading} />

      <Text style={{ color: COLORS.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: "600" }}>
        Route
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {routeChips.map((r) => {
          const sel = routeId === r.id;
          return (
            <TouchableOpacity
              key={r.id ?? "all"}
              onPress={() => setRouteId(r.id)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: sel ? COLORS.primary : COLORS.surface,
                borderWidth: 1,
                borderColor: sel ? COLORS.primary : "rgba(255,255,255,0.12)",
                marginRight: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ color: sel ? "#FFF" : COLORS.textDisabled, fontWeight: "600", fontSize: 12 }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} size="large" />}

      {!loading && data && (
        <>
          {/* K — KPI Summary Cards */}
          {sectionTitle("Overview")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
            {kpiCard("Total Revenue", rupees(data.summary.total_collected), "#FFFFFF")}
            {kpiCard("Deliveries", String(data.summary.total_delivered), "#2ECC71")}
            {kpiCard("Returns", String(data.summary.total_returned), "#E74C3C")}
            {kpiCard("Outstanding", rupees(data.stores.reduce((a, s) => a + s.outstanding, 0)), "#F39C12")}
            {kpiCard("Stores Visited", String(data.summary.total_stores_visited), "#3498DB")}
            {kpiCard("Avg / Store", rupees(data.summary.avg_sale_per_store), "#9B59B6")}
            {kpiCard("Cash", rupees(data.summary.total_cash), "#22C55E")}
            {kpiCard("UPI", rupees(data.summary.total_upi), "#3498DB")}
          </View>

          {/* A — Daily Sales Trend */}
          {data.daily.length > 1 && (
            <>
              {sectionTitle("Daily Sales Trend")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: dailyLabels.map((l, i) => (i % skipEvery === 0 ? l : "")),
                      datasets: [{ data: data.daily.map((d) => d.delivered), strokeWidth: 2 }],
                    }}
                    width={Math.max(CHART_W, data.daily.length * 45)}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 8 }}
                    withVerticalLines={false}
                  />
                </ScrollView>
                <Text style={{ color: COLORS.textDisabled, fontSize: 10, textAlign: "center", marginTop: 4 }}>
                  Units delivered per day
                </Text>
              </View>
            </>
          )}

          {/* J — Delivery vs Returns */}
          {data.daily.length > 1 && (
            <>
              {sectionTitle("Deliveries vs Returns")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: dailyLabels.map((l, i) => (i % skipEvery === 0 ? l : "")),
                      datasets: [
                        {
                          data: data.daily.map((d) => d.delivered),
                          color: () => "#2ECC71",
                          strokeWidth: 2,
                        },
                        {
                          data: data.daily.map((d) => d.returned),
                          color: () => "#E74C3C",
                          strokeWidth: 2,
                        },
                      ],
                      legend: ["Delivered", "Returned"],
                    }}
                    width={Math.max(CHART_W, data.daily.length * 45)}
                    height={220}
                    chartConfig={{ ...chartConfig, color: () => "#999" }}
                    bezier
                    style={{ borderRadius: 8 }}
                    withVerticalLines={false}
                  />
                </ScrollView>
              </View>
            </>
          )}

          {/* F — Daily Revenue Trend */}
          {data.daily.length > 1 && (
            <>
              {sectionTitle("Daily Revenue Trend")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: dailyLabels.map((l, i) => (i % skipEvery === 0 ? l : "")),
                      datasets: [{ data: data.daily.map((d) => d.collected), strokeWidth: 2 }],
                    }}
                    width={Math.max(CHART_W, data.daily.length * 45)}
                    height={200}
                    chartConfig={revenueChartConfig}
                    bezier
                    style={{ borderRadius: 8 }}
                    withVerticalLines={false}
                    formatYLabel={(v) => `₹${Math.round(Number(v))}`}
                  />
                </ScrollView>
                <Text style={{ color: COLORS.textDisabled, fontSize: 10, textAlign: "center", marginTop: 4 }}>
                  Revenue collected per day (₹)
                </Text>
              </View>
            </>
          )}

          {/* D — Daily Returns Trend */}
          {data.daily.length > 1 && (
            <>
              {sectionTitle("Returns Trend")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: dailyLabels.map((l, i) => (i % skipEvery === 0 ? l : "")),
                      datasets: [{
                        data: data.daily.map((d) => d.returned || 0),
                        strokeWidth: 2,
                      }],
                    }}
                    width={Math.max(CHART_W, data.daily.length * 45)}
                    height={200}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                      propsForDots: { r: "4", strokeWidth: "1", stroke: "#E74C3C" },
                    }}
                    bezier
                    style={{ borderRadius: 8 }}
                    withVerticalLines={false}
                  />
                </ScrollView>
                <Text style={{ color: COLORS.textDisabled, fontSize: 10, textAlign: "center", marginTop: 4 }}>
                  Units returned per day
                </Text>
              </View>
            </>
          )}

          {/* B — Store-wise Sales Comparison (Bar) */}
          {data.stores.length > 0 && (
            <>
              {sectionTitle("Store Sales Comparison")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={{
                      labels: data.stores.slice(0, 15).map((s) => truncName(s.store_name, 7)),
                      datasets: [{ data: data.stores.slice(0, 15).map((s) => s.delivered) }],
                    }}
                    width={Math.max(CHART_W, data.stores.slice(0, 15).length * 55)}
                    height={220}
                    chartConfig={chartConfig}
                    style={{ borderRadius: 8 }}
                    showValuesOnTopOfBars
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </ScrollView>
                <Text style={{ color: COLORS.textDisabled, fontSize: 10, textAlign: "center", marginTop: 4 }}>
                  Total units delivered (top 15 stores)
                </Text>
              </View>
            </>
          )}

          {/* B line — Compare stores side by side (line chart) */}
          {routeId != null && data.stores.length > 0 && data.daily.length > 1 && (
            <>
              {sectionTitle("Compare Stores (tap to select up to 5)")}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                {data.stores.map((s) => {
                  const sel = compareStores.includes(s.store_id);
                  const idx = compareStores.indexOf(s.store_id);
                  return (
                    <TouchableOpacity
                      key={s.store_id}
                      onPress={() => toggleCompareStore(s.store_id)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: sel ? CHART_COLORS[idx % CHART_COLORS.length] : COLORS.surface,
                        borderWidth: 1,
                        borderColor: sel ? "transparent" : "rgba(255,255,255,0.12)",
                        marginRight: 6,
                      }}
                    >
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>
                        {truncName(s.store_name, 14)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {storeComparisonLineData && (
                <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={storeComparisonLineData}
                      width={Math.max(CHART_W, storeComparisonLineData.labels.length * 45)}
                      height={220}
                      chartConfig={{ ...chartConfig, color: () => "#999" }}
                      bezier
                      style={{ borderRadius: 8 }}
                      withVerticalLines={false}
                    />
                  </ScrollView>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                    {compareStores.map((sid, i) => {
                      const nm = data.stores.find((s) => s.store_id === sid)?.store_name ?? "?";
                      return (
                        <View key={sid} style={{ flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], marginRight: 4 }} />
                          <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{truncName(nm, 16)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}

          {/* E — Top Returning Stores */}
          {data.stores.length > 0 && (
            <>
              {sectionTitle("Top Returning Stores")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                {(() => {
                  const sorted = [...data.stores].sort((a, b) => b.returned - a.returned).slice(0, 10).filter((s) => s.returned > 0);
                  if (sorted.length === 0)
                    return <Text style={{ color: COLORS.textSecondary, padding: 8 }}>No returns in this period.</Text>;
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <BarChart
                        data={{
                          labels: sorted.map((s) => truncName(s.store_name, 7)),
                          datasets: [{ data: sorted.map((s) => s.returned) }],
                        }}
                        width={Math.max(CHART_W, sorted.length * 55)}
                        height={200}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                        }}
                        style={{ borderRadius: 8 }}
                        showValuesOnTopOfBars
                        fromZero
                        yAxisLabel=""
                        yAxisSuffix=""
                      />
                    </ScrollView>
                  );
                })()}
              </View>
            </>
          )}

          {/* H — Outstanding Balance by Store */}
          {data.stores.length > 0 && (
            <>
              {sectionTitle("Outstanding Balance by Store")}
              <View style={[screenStyles.card, { padding: 8, overflow: "hidden" }]}>
                {(() => {
                  const sorted = [...data.stores].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10).filter((s) => s.outstanding > 0);
                  if (sorted.length === 0)
                    return <Text style={{ color: COLORS.textSecondary, padding: 8 }}>All dues cleared!</Text>;
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <BarChart
                        data={{
                          labels: sorted.map((s) => truncName(s.store_name, 7)),
                          datasets: [{ data: sorted.map((s) => s.outstanding) }],
                        }}
                        width={Math.max(CHART_W, sorted.length * 55)}
                        height={200}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(243, 156, 18, ${opacity})`,
                        }}
                        style={{ borderRadius: 8 }}
                        showValuesOnTopOfBars
                        fromZero
                        yAxisLabel="₹"
                        yAxisSuffix=""
                      />
                    </ScrollView>
                  );
                })()}
              </View>
            </>
          )}

          {/* I — Store Performance Cards */}
          {data.stores.length > 0 && (
            <>
              {sectionTitle("Top 5 Performers")}
              {data.stores.slice(0, 5).map((s, i) => (
                <View
                  key={s.store_id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: COLORS.surface,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: "800", width: 28 }}>
                    #{i + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{s.store_name}</Text>
                    <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 2 }}>
                      {s.delivered} del · {s.returned} ret · {rupees(s.collected)} collected
                    </Text>
                  </View>
                </View>
              ))}

              {data.stores.length > 5 && (
                <>
                  {sectionTitle("Bottom 5 Performers")}
                  {[...data.stores]
                    .sort((a, b) => a.delivered - b.delivered)
                    .slice(0, 5)
                    .map((s, i) => (
                      <View
                        key={s.store_id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: COLORS.surface,
                          borderRadius: 10,
                          padding: 12,
                          marginBottom: 6,
                          borderWidth: 1,
                          borderColor: "rgba(239,68,68,0.2)",
                        }}
                      >
                        <Text style={{ color: COLORS.error, fontSize: 18, fontWeight: "800", width: 28 }}>
                          #{i + 1}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>{s.store_name}</Text>
                          <Text style={{ color: COLORS.textDisabled, fontSize: 12, marginTop: 2 }}>
                            {s.delivered} del · {s.returned} ret · {rupees(s.collected)} collected
                          </Text>
                        </View>
                      </View>
                    ))}
                </>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </>
      )}

      {!loading && !data && (
        <Text style={{ color: COLORS.textDisabled, textAlign: "center", marginTop: 30 }}>
          Select filters and the dashboard will load automatically.
        </Text>
      )}
    </View>
  );
}
