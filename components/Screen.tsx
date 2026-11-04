import type { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";

type Edge = "top" | "right" | "bottom" | "left";

type Props = {
  children: ReactNode;
  /** Use for long forms */
  scroll?: boolean;
  /** Lift content when keyboard opens */
  keyboard?: boolean;
  /** Safe area edges (tabs: omit bottom to avoid gap above tab bar) */
  edges?: Edge[];
};

export function Screen({
  children,
  scroll,
  keyboard,
  edges = ["top", "right", "left"],
}: Props) {
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollInner}
    >
      {children}
    </ScrollView>
  ) : (
    <Pressable style={styles.fill} onPress={Keyboard.dismiss}>
      {children}
    </Pressable>
  );

  const wrapped =
    keyboard && Platform.OS === "ios" ? (
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        {content}
      </KeyboardAvoidingView>
    ) : (
      content
    );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fill: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
});
