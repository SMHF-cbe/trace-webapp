import { Platform } from "react-native";
import * as Location from "expo-location";

export type FreshCoordinates = {
  latitude: number;
  longitude: number;
};

export async function getFreshCoordinates(): Promise<FreshCoordinates> {
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.geolocation
  ) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let watchId: number | null = null;

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        callback();
      };

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          finish(() =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            })
          );
        },
        (error) => {
          finish(() =>
            reject(new Error(error.message || "Unable to read browser location."))
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 30000,
        }
      );
    });
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Location permission was not granted.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    mayShowUserSettingsDialog: true,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
