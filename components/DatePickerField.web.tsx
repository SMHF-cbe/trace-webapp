import { createElement, type ChangeEvent, type CSSProperties } from "react";
import { Text, View } from "react-native";
import { COLORS } from "../constants/colors";

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DatePickerFieldWeb({
  label,
  value,
  onChange,
  disabled,
}: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = event.currentTarget.value.split("-").map(Number);
    if (!year || !month || !day) return;
    onChange(new Date(year, month - 1, day));
  };

  const inputStyle: CSSProperties = {
    display: "block",
    width: "100%",
    minHeight: 48,
    boxSizing: "border-box",
    padding: "12px 14px",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 16,
    opacity: disabled ? 0.55 : 1,
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: COLORS.textSecondary,
          marginBottom: 6,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      {createElement("input", {
        type: "date",
        value: toDateInputValue(value),
        onChange: handleChange,
        disabled,
        "aria-label": label,
        style: inputStyle,
      })}
    </View>
  );
}
