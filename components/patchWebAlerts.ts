import { Alert, Platform } from "react-native";

type BrowserAlertButton = {
  text?: string;
  style?: string;
  onPress?: () => void;
};

type BrowserAlertOptions = {
  onDismiss?: () => void;
};

const browserAlert = Alert as unknown as {
  alert: (
    title: string,
    message?: string,
    buttons?: BrowserAlertButton[],
    options?: BrowserAlertOptions,
  ) => void;
};

if (Platform.OS === "web" && typeof window !== "undefined") {
  browserAlert.alert = (title, message, buttons, options) => {
    const text = [title, message].filter(Boolean).join("\n\n");
    if (!buttons?.length) {
      window.alert(text);
      options?.onDismiss?.();
      return;
    }

    const cancelButton = buttons.find(
      (button) =>
        button.style === "cancel" || /^(cancel|no|stay|keep)$/i.test(button.text ?? ""),
    );
    const primaryButton =
      buttons.find((button) => button !== cancelButton && button.onPress) ??
      buttons.find((button) => button !== cancelButton);

    if (cancelButton && primaryButton?.onPress) {
      if (window.confirm(text)) {
        primaryButton.onPress();
      } else {
        cancelButton.onPress?.();
        options?.onDismiss?.();
      }
      return;
    }

    window.alert(text);
    primaryButton?.onPress?.();
    options?.onDismiss?.();
  };
}
