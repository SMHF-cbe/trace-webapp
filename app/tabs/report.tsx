import { useCallback, useState } from "react";

import {

  View,

  Text,

  FlatList,

  TouchableOpacity,

  Alert,

  ActivityIndicator,

  Platform,

  RefreshControl,

} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import * as FileSystem from "expo-file-system/legacy";

import * as Sharing from "expo-sharing";

import { COLORS } from "../../constants/colors";

import { API_BASE } from "../../constants/config";

import { useSession } from "../../context/SessionContext";

import { screenStyles } from "../../constants/screenStyles";

import { Screen } from "../../components/Screen";



const PDF_FETCH_MS = 45000;



function SummaryRow({ label, value }: { label: string; value: string }) {

  return (

    <View

      style={{

        flexDirection: "row",

        justifyContent: "space-between",

        paddingVertical: 6,

        borderBottomWidth: 1,

        borderBottomColor: "rgba(0,0,0,0.06)",

      }}

    >

      <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>{label}</Text>

      <Text style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" }}>{value}</Text>

    </View>

  );

}



function arrayBufferToBase64(buffer: ArrayBuffer): string {

  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {

    binary += String.fromCharCode(bytes[i]!);

  }

  return globalThis.btoa(binary);

}



function pdfErrorMessage(err: unknown): string {

  const msg = err instanceof Error ? err.message : String(err);

  const base = API_BASE.replace(/\/$/, "");

  const lines = [

    `Could not download the PDF.`,

    ``,

    `Using API: ${base}`,

    ``,

    `Check:`,

    `• Phone and server on the same Wi‑Fi`,

    `• EXPO_PUBLIC_API_URL in .env = your PC’s LAN IP (not localhost on a real device)`,

    `• Backend: uvicorn --host 0.0.0.0 --port 8000 (not only 127.0.0.1)`,

    `• Firewall allows that port; Expo Go may ignore app.json — use a dev build for full native settings`,

  ];

  if (msg === "Aborted" || msg.includes("aborted")) {

    lines.splice(2, 0, "Request timed out.");

  } else if (msg) {

    lines.splice(2, 0, `Details: ${msg}`);

  }

  return lines.join("\n");

}



async function fetchPdfBytes(url: string): Promise<ArrayBuffer> {

  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), PDF_FETCH_MS);

  try {

    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {

      throw new Error(`HTTP ${res.status}`);

    }

    return await res.arrayBuffer();

  } finally {

    clearTimeout(timer);

  }

}



async function writePdfToPath(destUri: string, bytes: ArrayBuffer): Promise<void> {

  const b64 = arrayBufferToBase64(bytes);

  await FileSystem.writeAsStringAsync(destUri, b64, {

    encoding: FileSystem.EncodingType.Base64,

  });

}



export default function ReportScreen() {

  const { session } = useSession();

  const [data, setData] = useState<any[]>([]);

  const [summary, setSummary] = useState<any>({});

  const [loading, setLoading] = useState(false);

  const [pdfBusy, setPdfBusy] = useState(false);



  const fetchReport = useCallback(async () => {

    if (!session?.route_id) {

      setData([]);

      setSummary({});

      return;

    }

    setLoading(true);

    try {

      const res = await fetch(`${API_BASE}/report/today?route_id=${session.route_id}`);

      const json = await res.json();

      if (!res.ok) {

        Alert.alert("Error", typeof json.detail === "string" ? json.detail : "Could not load report.");

        return;

      }

      setData(json.stores || []);

      setSummary(json.summary || {});

    } catch (err) {

      console.log(err);

      Alert.alert("Error", "Check connection and try again.");

    } finally {

      setLoading(false);

    }

  }, [session?.route_id]);



  useFocusEffect(

    useCallback(() => {

      fetchReport();

    }, [fetchReport])

  );



  const downloadAndSharePdf = async () => {

    if (!session?.route_id) {

      Alert.alert("Sign in first", "Open the Stores tab after logging in to a route.");

      return;

    }



    const dateStr = new Date().toISOString().slice(0, 10);

    const filename = `route_sync-daily-${dateStr}.pdf`;

    const url = `${API_BASE}/report/today/pdf?route_id=${session.route_id}`;



    if (Platform.OS === "web") {

      setPdfBusy(true);

      try {

        const bytes = await fetchPdfBytes(url);

        const blob = new Blob([bytes], { type: "application/pdf" });

        const objectUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = objectUrl;

        a.download = filename;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);



        const nav = globalThis.navigator as Navigator & {

          share?: (data: ShareData) => Promise<void>;

          canShare?: (data: ShareData) => boolean;

        };

        if (typeof nav.share === "function" && typeof nav.canShare === "function") {

          const file = new File([blob], filename, { type: "application/pdf" });

          const payload: ShareData = { files: [file], title: "Today’s report", text: "route_sync daily PDF" };

          if (nav.canShare(payload)) {

            try {

              await nav.share(payload);

            } catch (e) {

              if ((e as Error).name !== "AbortError") {

                console.log(e);

              }

            }

          }

        }

      } catch (err) {

        console.log(err);

        Alert.alert("PDF", pdfErrorMessage(err));

      } finally {

        setPdfBusy(false);

      }

      return;

    }



    setPdfBusy(true);

    try {

      const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";

      if (!base) {

        Alert.alert("PDF", "Storage is not available on this device.");

        return;

      }

      const path = `${base}${filename}`;



      const bytes = await fetchPdfBytes(url);

      await writePdfToPath(path, bytes);



      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {

        try {

          await Sharing.shareAsync(path, {

            mimeType: "application/pdf",

            dialogTitle: "Share today’s report",

            UTI: "com.adobe.pdf",

          });

        } catch (shareErr) {

          console.log(shareErr);

          Alert.alert(

            "PDF saved",

            `The file was downloaded, but sharing failed.\n\nSaved to:\n${path}\n\nYou can open Files and share it from there.`

          );

        }

      } else {

        Alert.alert("Saved", `PDF saved to:\n${path}\n\nSharing is not available on this device.`);

      }

    } catch (err) {

      console.log(err);

      Alert.alert("PDF", pdfErrorMessage(err));

    } finally {

      setPdfBusy(false);

    }

  };



  if (!session?.route_id) {

    return (

      <Screen edges={["top", "right", "left"]}>

        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: "center" }}>

          <Text style={[screenStyles.title, { fontSize: 22 }]}>Today’s report</Text>

          <Text style={[screenStyles.subtitle, { textAlign: "center" }]}>

            From the home screen, pick a route and sign in. This tab only shows data for the route you are logged into.

          </Text>

        </View>

      </Screen>

    );

  }



  const listHeader = (

    <>

      <Text style={[screenStyles.title, { fontSize: 24 }]}>Today’s report</Text>

      <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600", marginBottom: 4 }}>

        {session.route_name}

      </Text>

      <Text style={[screenStyles.subtitle, { marginBottom: 14 }]}>

        Totals for your route only. Pull down to refresh.

      </Text>



      {loading && data.length === 0 && (

        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />

      )}



      <View style={screenStyles.card}>

        <Text style={[screenStyles.sectionLabel, { marginBottom: 10 }]}>Summary</Text>

        <SummaryRow label="Total units sold" value={String(summary.total_sold ?? 0)} />

        <SummaryRow label="Cash collected" value={`₹${Number(summary.cash ?? 0).toFixed(2)}`} />

        <SummaryRow label="UPI collected" value={`₹${Number(summary.upi ?? 0).toFixed(2)}`} />

        <SummaryRow label="Balance due" value={`₹${Number(summary.balance ?? 0).toFixed(2)}`} />

        <SummaryRow label="Returns (units)" value={String(summary.returns ?? 0)} />

      </View>



      <Text style={[screenStyles.sectionLabel, { marginTop: 8, marginBottom: 8 }]}>By store</Text>

    </>

  );



  const listFooter = (

    <TouchableOpacity

      onPress={downloadAndSharePdf}

      disabled={pdfBusy}

      style={[screenStyles.primaryBtn, { marginTop: 16, marginBottom: 24 }, pdfBusy && { opacity: 0.75 }]}

    >

      {pdfBusy ? (

        <ActivityIndicator color="#FFFFFF" />

      ) : (

        <Text style={screenStyles.primaryBtnText}>Download &amp; share PDF</Text>

      )}

    </TouchableOpacity>

  );



  return (

    <Screen edges={["top", "right", "left"]}>

      <FlatList

        data={data}

        keyExtractor={(item: any, i) => `${item.name}-${i}`}

        ListHeaderComponent={listHeader}

        ListFooterComponent={listFooter}

        refreshControl={

          <RefreshControl refreshing={loading} onRefresh={fetchReport} tintColor={COLORS.primary} />

        }

        ListEmptyComponent={

          !loading ? (

            <View style={[screenStyles.card, { alignItems: "center" }]}>

              <Text style={{ color: COLORS.textSecondary, textAlign: "center" }}>

                No entries yet today for this route. Record visits from the Stores tab.

              </Text>

            </View>

          ) : null

        }

        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, flexGrow: 1 }}

        renderItem={({ item }: any) => (

          <View

            style={{

              backgroundColor: COLORS.card,

              padding: 14,

              marginBottom: 10,

              borderRadius: 12,

              borderWidth: 1,

              borderColor: "rgba(0,0,0,0.06)",

            }}

          >

            <Text style={{ fontWeight: "700", fontSize: 16, color: COLORS.textPrimary, marginBottom: 6 }}>

              {item.name}

            </Text>

            {item.is_closed ? (

              <Text style={{ color: COLORS.error, fontWeight: "600" }}>Shop closed — no sale</Text>

            ) : (

              <>

                <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>

                  Delivered: {item.delivered} · Returned: {item.returned}

                </Text>

                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>

                  Collected: ₹{item.collected} · Balance: ₹{item.balance}

                </Text>

                {item.delivered === 0 && item.returned === 0 && (

                  <Text style={{ color: COLORS.warning, marginTop: 8, fontSize: 13 }}>

                    No purchase (visit recorded)

                  </Text>

                )}

              </>

            )}

          </View>

        )}

      />

    </Screen>

  );

}


