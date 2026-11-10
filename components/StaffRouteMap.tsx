import { Text, View } from "react-native";
import { COLORS } from "../constants/colors";

export type MapStore = {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  entered_today?: boolean;
  is_active?: boolean;
};

type Props = {
  stores: MapStore[];
  nextStoreId: number | null;
};

export function StaffRouteMap({ stores }: Props) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 420,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: COLORS.surface,
      }}
    >
      <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
        The staff map is available in the web app.
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: "center", marginTop: 8 }}>
        {stores.length} stores are loaded for this route.
      </Text>
    </View>
  );
}
