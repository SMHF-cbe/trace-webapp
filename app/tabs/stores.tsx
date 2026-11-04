import React, { useState, useCallback } from "react";

import {

  View,

  Text,

  FlatList,

  TouchableOpacity,

  TextInput,

  Alert,

  ActivityIndicator,

} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useRouter, useLocalSearchParams } from "expo-router";

import { useFocusEffect } from "@react-navigation/native";

import { COLORS } from "../../constants/colors";

import { outstandingDueColor } from "../../constants/outstandingThresholds";

import { API_BASE } from "../../constants/config";

import { useSession } from "../../context/SessionContext";

import { screenStyles, placeholderColor } from "../../constants/screenStyles";

import { Screen } from "../../components/Screen";



type StoreFilter = "active" | "due" | "inactive" | "all";



type StoreRow = {

  id: number;

  name: string;

  price: number;

  entered_today: boolean;

  is_active: boolean;

  outstanding?: number;

};



export default function Stores() {

  const router = useRouter();

  const params = useLocalSearchParams();

  const { session, clearSession } = useSession();



  const route_id = params.route_id ?? (session ? String(session.route_id) : undefined);

  const routeName = params.name ?? session?.route_name ?? "This route";

  const [filter, setFilter] = useState<StoreFilter>("active");



  const [stores, setStores] = useState<StoreRow[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);



  const fetchStores = useCallback(async () => {

    if (!route_id) return;

    setLoading(true);

    try {

      const res = await fetch(`${API_BASE}/stores/${route_id}?include_inactive=true`);

      const data = await res.json();

      setStores(Array.isArray(data) ? data : []);

    } catch (err) {

      console.log("Fetch error:", err);

      setStores([]);

    } finally {

      setLoading(false);

    }

  }, [route_id]);



  useFocusEffect(

    useCallback(() => {

      void fetchStores();

    }, [fetchStores])

  );



  const filteredStores = stores

    .filter((s) => {

      if (filter === "active") return s.is_active !== false;

      if (filter === "due") return (s.outstanding ?? 0) > 0.005;

      if (filter === "inactive") return s.is_active === false;

      return true;

    })

    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

    .sort((a, b) => Number(a.entered_today) - Number(b.entered_today));



  const openStore = (item: StoreRow) => {

    const active = item.is_active !== false;

    if (!active) {

      router.push({

        pathname: "/store-info",

        params: { store_id: String(item.id), route_id: String(route_id) },

      });

      return;

    }

    router.push({

      pathname: "/entry",

      params: {

        store_id: item.id,

        route_id,

        name: item.name,

      },

    });

  };



  const openStoreInfo = (item: StoreRow) => {

    router.push({

      pathname: "/store-info",

      params: { store_id: String(item.id), route_id: String(route_id) },

    });

  };



  const filterChip = (key: StoreFilter, label: string) => {

    const on = filter === key;

    return (

      <TouchableOpacity

        key={key}

        onPress={() => setFilter(key)}

        style={{

          paddingVertical: 8,

          paddingHorizontal: 16,

          borderRadius: 22,

          backgroundColor: on ? COLORS.primary : "#FFFFFF",

          borderWidth: 1.5,

          borderColor: on ? COLORS.primary : "#D1D5DB",

          marginRight: 8,

          marginBottom: 8,

        }}

      >

        <Text

          style={{

            fontSize: 14,

            fontWeight: "600",

            color: on ? "#FFFFFF" : COLORS.textPrimary,

          }}

        >

          {label}

        </Text>

      </TouchableOpacity>

    );

  };



  return (

    <Screen edges={["top", "right", "left"]}>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>

        <TouchableOpacity

          onPress={() => {

            Alert.alert("Leave this route?", "You will return to the route list and need the route PIN again to come back.", [

              { text: "Cancel", style: "cancel" },

              {

                text: "Leave",

                style: "destructive",

                onPress: async () => {

                  await clearSession();

                  router.replace("/");

                },

              },

            ]);

          }}

          accessibilityRole="button"

          accessibilityLabel="Leave route"

          style={{ alignSelf: "flex-start", marginBottom: 4, paddingVertical: 4 }}

        >

          <Text

            style={{

              fontSize: 16,

              fontWeight: "600",

              color: COLORS.warning,

            }}

          >

            ← Leave route

          </Text>

        </TouchableOpacity>

        <View

          style={{

            flexDirection: "row",

            justifyContent: "space-between",

            alignItems: "flex-start",

            marginBottom: 6,

          }}

        >

          <View style={{ flex: 1, marginRight: 8 }}>

            <Text style={[screenStyles.title, { fontSize: 24 }]}>Stores</Text>

            <Text style={{ color: COLORS.textDisabled, fontSize: 14, marginTop: 4 }}>

              {routeName}

            </Text>

          </View>

          <TouchableOpacity

            onPress={() =>

              router.push({

                pathname: "/add-store",

                params: { route_id },

              })

            }

            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

            accessibilityRole="button"

            accessibilityLabel="Add new store"

            style={{ paddingTop: 2 }}

          >

            <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />

          </TouchableOpacity>

        </View>



        <Text style={[screenStyles.subtitle, { marginBottom: 10 }]}>

          Tap a row for today&apos;s entry. Use the + icon (top right) to add a store. Info icon opens details and map.

        </Text>



        <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>Filter</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 4 }}>

          {filterChip("active", "Active")}

          {filterChip("due", "Balance due")}

          {filterChip("inactive", "Inactive")}

          {filterChip("all", "All")}

        </View>



        <TextInput

          placeholder="Search by store name…"

          placeholderTextColor={placeholderColor}

          value={search}

          onChangeText={setSearch}

          style={[screenStyles.input, { marginBottom: 16, backgroundColor: "#FFFFFF" }]}

          accessibilityLabel="Search stores"

        />



        {loading ? (

          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />

        ) : filteredStores.length === 0 ? (

          <View style={screenStyles.card}>

            <Text style={{ color: COLORS.textSecondary, lineHeight: 22 }}>

              {stores.length === 0

                ? "No stores on this route yet. Tap the + icon above to add one, or import from Excel (admin)."

                : "No stores match this filter or search."}

            </Text>

          </View>

        ) : (

          <FlatList

            data={filteredStores}

            keyExtractor={(item) => item.id.toString()}

            contentContainerStyle={{ paddingBottom: 32 }}

            renderItem={({ item }) => {

              const isEntered = item.entered_today;

              const isInactive = item.is_active === false;

              const due = Number(item.outstanding ?? 0);

              const dueColor = outstandingDueColor(due);

              return (

                <View

                  style={{

                    marginBottom: 10,

                    padding: 16,

                    borderRadius: 12,

                    backgroundColor: isInactive ? "#F3F4F6" : "#FFFFFF",

                    borderLeftWidth: isEntered && !isInactive ? 5 : 0,

                    borderLeftColor: COLORS.success,

                    borderWidth: 1,

                    borderColor: isInactive ? "#D1D5DB" : "#E5E7EB",

                  }}

                >

                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>

                    <TouchableOpacity

                      onPress={() => openStore(item)}

                      style={{ flex: 1, paddingRight: 8 }}

                      accessibilityRole="button"

                      accessibilityLabel={`Open ${item.name}`}

                    >

                      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>

                        <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, flexShrink: 1 }}>

                          {item.name}

                        </Text>

                        {dueColor != null && (

                          <Text

                            style={{

                              marginLeft: 8,

                              fontSize: 14,

                              fontWeight: "700",

                              color: dueColor,

                            }}

                          >

                            Due ₹{due.toFixed(2)}

                          </Text>

                        )}

                      </View>

                      {isInactive && (

                        <Text style={{ color: COLORS.error, fontWeight: "600", marginTop: 4, fontSize: 13 }}>

                          Inactive — tap row for details / reactivate

                        </Text>

                      )}

                      <Text style={{ color: COLORS.textSecondary, marginTop: 6, fontSize: 15 }}>

                        ₹{item.price} per unit

                      </Text>

                      {isEntered && !isInactive && (

                        <Text style={{ color: COLORS.success, marginTop: 8, fontSize: 13, fontWeight: "600" }}>

                          Saved today — tap to edit

                        </Text>

                      )}

                    </TouchableOpacity>

                    <TouchableOpacity

                      onPress={() => openStoreInfo(item)}

                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

                      accessibilityRole="button"

                      accessibilityLabel={`Store info for ${item.name}`}

                      style={{ padding: 4 }}

                    >

                      <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />

                    </TouchableOpacity>

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


