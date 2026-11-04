import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { COLORS } from "../constants/colors";
import { API_BASE } from "../constants/config";
import { screenStyles } from "../constants/screenStyles";
import { useAdminAuth, adminSecretHeaders } from "../context/AdminAuthContext";
import DatePickerField from "../components/DatePickerField";
import AdminDashboard from "../components/AdminDashboard";

type RouteRow = { id: number; route_code?: number | null; name: string };
type StoreReportRow = {
  store_id: number;
  store_name: string;
  route_id: number;
  route_code?: number | null;
  route_name: string;
  delivered: number;
  returned: number;
  collected: number;
  balance: number;
};

type RangeReport = {
  from_date: string;
  to_date: string;
  route: { id: number; route_code?: number | null; name: string } | null;
  summary: {
    total_delivered: number;
    total_returns: number;
    cash: number;
    upi: number;
    total_collected: number;
    total_balance: number;
  };
  stores: StoreReportRow[];
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function b64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return globalThis.btoa(binary);
}

type Tab = "dashboard" | "master";

export default function AdminReportsScreen() {
  const router = useRouter();
  const { ready, isAdmin, adminSecret } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  const [fromDateObj, setFromDateObj] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [toDateObj, setToDateObj] = useState(() => new Date());

  const fromDate = ymd(fromDateObj);
  const toDate = ymd(toDateObj);
  const [routeId, setRouteId] = useState<string>("");
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<RangeReport | null>(null);

  const routeOptions = useMemo(() => [{ id: "", name: "All routes" }, ...routes], [routes]);

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/admin-login");
  }, [ready, isAdmin, router]);

  const loadRoutes = useCallback(async () => {
    if (!adminSecret) return;
    setLoadingRoutes(true);
    try {
      const res = await fetch(`${API_BASE}/admin/routes`, {
        headers: adminSecretHeaders(adminSecret),
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      setRoutes(Array.isArray(data) ? data : []);
    } catch {
      setRoutes([]);
    } finally {
      setLoadingRoutes(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    if (ready && isAdmin) void loadRoutes();
  }, [ready, isAdmin, loadRoutes]);

  const validateRange = (): boolean => {
    if (!isYmd(fromDate) || !isYmd(toDate)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD format for both dates.");
      return false;
    }
    if (toDate < fromDate) {
      Alert.alert("Invalid range", "To date must be the same or after From date.");
      return false;
    }
    return true;
  };

  const buildUrl = (suffix: "range" | "range/pdf" | "range/csv"): string => {
    const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
    if (routeId) params.set("route_id", routeId);
    return `${API_BASE}/admin/report/${suffix}?${params.toString()}`;
  };

  const fetchReport = useCallback(async () => {
    if (!adminSecret || !validateRange()) return;
    setLoading(true);
    try {
      const res = await fetch(buildUrl("range"), { headers: adminSecretHeaders(adminSecret) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Report error", typeof data.detail === "string" ? data.detail : "Could not load report");
        return;
      }
      setReport(data as RangeReport);
    } catch {
      Alert.alert("Error", "Network problem while loading report.");
    } finally {
      setLoading(false);
    }
  }, [adminSecret, fromDate, toDate, routeId]);

  const downloadFile = useCallback(
    async (kind: "pdf" | "csv") => {
      if (!adminSecret || !validateRange()) return;
      setExporting(true);
      try {
        const endpoint = kind === "pdf" ? "range/pdf" : "range/csv";
        const res = await fetch(buildUrl(endpoint as "range/pdf" | "range/csv"), {
          headers: adminSecretHeaders(adminSecret),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          Alert.alert("Export error", typeof j.detail === "string" ? j.detail : `Could not export ${kind.toUpperCase()}`);
          return;
        }

        const routeLabel = routeId || "all";
        const filename = `admin-report-${routeLabel}-${fromDate}-to-${toDate}.${kind}`;

        if (Platform.OS === "web") {
          const blob =
            kind === "pdf"
              ? new Blob([await res.arrayBuffer()], { type: "application/pdf" })
              : new Blob([await res.text()], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          return;
        }

        const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
        if (!base) {
          Alert.alert("Export", "Storage is not available on this device.");
          return;
        }
        const path = `${base}${filename}`;

        if (kind === "pdf") {
          const bytes = await res.arrayBuffer();
          const b64 = b64FromArrayBuffer(bytes);
          await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        } else {
          const csvText = await res.text();
          await FileSystem.writeAsStringAsync(path, csvText);
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, {
            mimeType: kind === "pdf" ? "application/pdf" : "text/csv",
            dialogTitle: `Share ${kind.toUpperCase()} report`,
            UTI: kind === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Saved", `File saved to:\n${path}`);
        }
      } catch {
        Alert.alert("Error", `Could not export ${kind.toUpperCase()}.`);
      } finally {
        setExporting(false);
      }
    },
    [adminSecret, fromDate, toDate, routeId]
  );

  if (!ready || !isAdmin) {
    return (
      <Screen edges={["top", "right", "left", "bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const tabBtn = (label: string, key: Tab) => {
    const active = tab === key;
    return (
      <TouchableOpacity
        onPress={() => setTab(key)}
        style={{
          flex: 1,
          paddingVertical: 12,
          alignItems: "center",
          borderBottomWidth: 3,
          borderBottomColor: active ? COLORS.primary : "transparent",
        }}
      >
        <Text
          style={{
            color: active ? "#FFFFFF" : COLORS.textDisabled,
            fontWeight: active ? "700" : "500",
            fontSize: 15,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scroll keyboard edges={["top", "right", "left", "bottom"]}>
      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
        <Text style={screenStyles.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={screenStyles.title}>Reports</Text>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          marginBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        }}
      >
        {tabBtn("Dashboard", "dashboard")}
        {tabBtn("Master Report", "master")}
      </View>

      {/* ============ DASHBOARD TAB ============ */}
      {tab === "dashboard" && adminSecret && (
        <AdminDashboard adminSecret={adminSecret} routes={routes} />
      )}

      {/* ============ MASTER REPORT TAB ============ */}
      {tab === "master" && (
        <>
          <Text style={[screenStyles.subtitle, { marginBottom: 14 }]}>
            Filter by route and date range, then export PDF/CSV.
          </Text>

          <DatePickerField
            label="From date"
            value={fromDateObj}
            onChange={setFromDateObj}
            disabled={loading || exporting}
          />

          <DatePickerField
            label="To date"
            value={toDateObj}
            onChange={setToDateObj}
            disabled={loading || exporting}
          />

          <Text style={{ color: COLORS.textSecondary, marginBottom: 8, fontSize: 13, fontWeight: "600" }}>
            Route filter {loadingRoutes ? "(loading...)" : ""}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}>
            {routeOptions.map((r) => {
              const id = String((r as any).id ?? "");
              const selected = routeId === id;
              const chipLabel =
                id === "" ? "All routes" : `R${(r as any).route_code ?? (r as any).id} ${(r as any).name}`;
              return (
                <TouchableOpacity
                  key={id || "all-routes"}
                  onPress={() => setRouteId(id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: selected ? COLORS.primary : COLORS.surface,
                    marginRight: 6,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: selected ? COLORS.primary : "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text style={{ color: selected ? "#FFF" : COLORS.textDisabled, fontWeight: "600", fontSize: 12 }}>
                    {chipLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => void fetchReport()}
            disabled={loading || exporting}
            style={[screenStyles.primaryBtn, (loading || exporting) && { opacity: 0.75 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={screenStyles.primaryBtnText}>Generate report</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => void downloadFile("pdf")}
              disabled={loading || exporting}
              style={[screenStyles.secondaryBtn, { flex: 1, marginRight: 6 }, (loading || exporting) && { opacity: 0.75 }]}
            >
              <Text style={screenStyles.secondaryBtnText}>Export PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void downloadFile("csv")}
              disabled={loading || exporting}
              style={[screenStyles.secondaryBtn, { flex: 1, marginLeft: 6 }, (loading || exporting) && { opacity: 0.75 }]}
            >
              <Text style={screenStyles.secondaryBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {report ? (
            <>
              <View style={[screenStyles.card, { marginTop: 14 }]}>
                <Text style={[screenStyles.sectionLabel, { marginBottom: 8 }]}>Summary</Text>
                <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
                  Range: {report.from_date} to {report.to_date}
                </Text>
                <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
                  Delivered: {report.summary.total_delivered}
                </Text>
                <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
                  Returns: {report.summary.total_returns}
                </Text>
                <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
                  Cash: ₹{Number(report.summary.cash).toFixed(2)}
                </Text>
                <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
                  UPI: ₹{Number(report.summary.upi).toFixed(2)}
                </Text>
                <Text style={{ color: COLORS.textPrimary, marginBottom: 4 }}>
                  Total collected: ₹{Number(report.summary.total_collected).toFixed(2)}
                </Text>
                <Text style={{ color: COLORS.textPrimary }}>
                  Balance: ₹{Number(report.summary.total_balance).toFixed(2)}
                </Text>
              </View>

              <Text style={[screenStyles.sectionLabel, { marginTop: 12, marginBottom: 8 }]}>
                Stores ({report.stores.length})
              </Text>
              <FlatList
                data={report.stores}
                keyExtractor={(item) => String(item.store_id)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[screenStyles.card, { marginBottom: 8, padding: 12 }]}>
                    <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{item.store_name}</Text>
                    <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>
                      Route: {item.route_code != null ? `R${item.route_code}` : `ID ${item.route_id}`} -{" "}
                      {item.route_name}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>
                      Del {item.delivered} · Ret {item.returned} · Col ₹{Number(item.collected).toFixed(2)} · Bal ₹
                      {Number(item.balance).toFixed(2)}
                    </Text>
                  </View>
                )}
              />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
