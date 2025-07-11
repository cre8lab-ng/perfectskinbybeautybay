import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = Cookies.get("device_id") || localStorage.getItem("device_id");

    if (!deviceId) {
      deviceId = uuidv4();
      console.log(`🆕 New device_id generated and stored: ${deviceId}`);

      Cookies.set("device_id", deviceId, {
        expires: 365,
        secure: true,
        sameSite: "Strict",
      });

      localStorage.setItem("device_id", deviceId);
    } else {
      console.log(`✅ Existing device_id found: ${deviceId}`);
    }

    return deviceId;
  } catch (error) {
    console.error("⚠️ Error accessing storage for device ID", error);
    return "unknown";
  }
}
