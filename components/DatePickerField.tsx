import { useState } from "react";
import { View, Text, TouchableOpacity, Platform, Modal } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { COLORS } from "../constants/colors";
import { screenStyles } from "../constants/screenStyles";

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
};

function formatDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const mon = months[d.getMonth()];
  return `${day} ${mon} ${d.getFullYear()}`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  disabled,
}: Props) {
  const [show, setShow] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(selected);
  };

  if (Platform.OS === "ios") {
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
        <TouchableOpacity
          onPress={() => setShow(true)}
          disabled={disabled}
          style={[
            screenStyles.input,
            {
              backgroundColor: COLORS.card,
              justifyContent: "center",
            },
            disabled && { opacity: 0.55 },
          ]}
        >
          <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>
            {formatDisplay(value)}
          </Text>
        </TouchableOpacity>

        <Modal
          transparent
          animationType="slide"
          visible={show}
          onRequestClose={() => setShow(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: 30,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  paddingHorizontal: 16,
                  paddingTop: 14,
                }}
              >
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                themeVariant="light"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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
      <TouchableOpacity
        onPress={() => setShow(true)}
        disabled={disabled}
        style={[
          screenStyles.input,
          {
            backgroundColor: COLORS.card,
            justifyContent: "center",
          },
          disabled && { opacity: 0.55 },
        ]}
      >
        <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>
          {formatDisplay(value)}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display="calendar"
          // @ts-expect-error The runtime picker accepts this prop although the non-iOS type omits it.
          themeVariant="light"
          onChange={handleChange}
        />
      )}
    </View>
  );
}
