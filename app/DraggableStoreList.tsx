import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
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

const ROW_HEIGHT = 78;

export function DraggableStoreList({ stores, saving, onOpenStore, onReorder }: Props) {
  const [orderedStores, setOrderedStores] = useState(stores);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const startIndex = useRef<number | null>(null);
  const latestStores = useRef(stores);

  useEffect(() => {
    if (draggedId == null) {
      setOrderedStores(stores);
      latestStores.current = stores;
    }
  }, [stores, draggedId]);

  const moveStore = (index: number, dy: number) => {
    const current = latestStores.current;
    const nextIndex = Math.max(0, Math.min(current.length - 1, index + Math.round(dy / ROW_HEIGHT)));
    if (nextIndex === index) {
      setDragOffset(dy);
      return;
    }
    const next = [...current];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    latestStores.current = next;
    setOrderedStores(next);
    startIndex.current = nextIndex;
    setDragOffset(dy - (nextIndex - index) * ROW_HEIGHT);
  };

  const responders = useMemo(
    () =>
      orderedStores.map((store, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
          onPanResponderGrant: () => {
            startIndex.current = index;
            latestStores.current = orderedStores;
            setDraggedId(store.id);
            setDragOffset(0);
          },
          onPanResponderMove: (_, gesture) => {
            if (startIndex.current != null) moveStore(startIndex.current, gesture.dy);
          },
          onPanResponderRelease: () => {
            if (latestStores.current.some((item, itemIndex) => item.id !== orderedStores[itemIndex]?.id)) {
              onReorder(latestStores.current);
            }
            startIndex.current = null;
            setDraggedId(null);
            setDragOffset(0);
          },
          onPanResponderTerminate: () => {
            startIndex.current = null;
            setDraggedId(null);
            setDragOffset(0);
          },
        })
      ),
    [onReorder, orderedStores]
  );

  return (
    <View>
      <Text style={styles.caption}>
        {saving ? "Saving new order…" : `${orderedStores.length} store(s) — drag the handle to reorder, tap a row to edit`}
      </Text>
      {orderedStores.map((store, index) => {
        const isDragging = draggedId === store.id;
        return (
          <View
            key={store.id}
            {...responders[index].panHandlers}
            style={[styles.row, isDragging && styles.draggingRow, isDragging && { transform: [{ translateY: dragOffset }] }]}
          >
            <View style={styles.handle} accessibilityLabel={`Drag ${store.name}`}>
              <Text style={styles.handleText}>☷</Text>
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
        );
      })}
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
    minHeight: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.section,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  draggingRow: {
    zIndex: 10,
    opacity: 0.9,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  handle: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  handleText: {
    color: COLORS.primary,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "700",
  },
  storeButton: {
    flex: 1,
    minHeight: ROW_HEIGHT - 2,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 12,
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