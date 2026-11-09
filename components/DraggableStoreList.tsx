import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";

type StoreItem = {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
  sort_order?: number;
};

type Props = {
  stores: StoreItem[];
  saving: boolean;
  onOpenStore: (store: StoreItem) => void;
  onReorder: (stores: StoreItem[]) => void;
};

export function DraggableStoreList({ stores, saving, onOpenStore, onReorder }: Props) {
  const [orderedStores, setOrderedStores] = useState(stores);

  useEffect(() => {
    setOrderedStores(stores);
  }, [stores]);

  const moveStore = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedStores.length || saving) return;
    const next = [...orderedStores];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    setOrderedStores(next);
    onReorder(next);
  };

  return (
    <View>
      <Text style={styles.caption}>
        {saving
          ? "Saving new order…"
          : `${orderedStores.length} store(s) — use ▲ and ▼ to change position`}
      </Text>
      {orderedStores.map((store, index) => (
        <View key={store.id} style={styles.row}>
          <View style={styles.positionColumn}>
            <View style={styles.positionPill}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>
            <TouchableOpacity
              onPress={() => moveStore(index, -1)}
              disabled={index === 0 || saving}
              style={[styles.arrowButton, (index === 0 || saving) && styles.disabledButton]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${store.name} up`}
            >
              <Text style={styles.arrowText}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => moveStore(index, 1)}
              disabled={index === orderedStores.length - 1 || saving}
              style={[
                styles.arrowButton,
                (index === orderedStores.length - 1 || saving) && styles.disabledButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${store.name} down`}
            >
              <Text style={styles.arrowText}>▼</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => onOpenStore(store)}
            activeOpacity={0.75}
            style={styles.storeButton}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${store.name}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeMeta}>
                ₹{store.price}/unit
                {!store.is_active ? " · inactive" : ""}
              </Text>
            </View>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
      ))}
      {saving ? <ActivityIndicator color={COLORS.primary} style={styles.saving} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: COLORS.section,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  positionColumn: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "rgba(46, 204, 113, 0.08)",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  positionPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginBottom: 4,
  },
  positionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  arrowButton: {
    width: 38,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.25,
  },
  arrowText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  storeButton: {
    flex: 1,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  storeMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  editText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  saving: {
    marginVertical: 4,
  },
});
