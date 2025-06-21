import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

export function getOrCreateDeviceId(): string {
  let deviceId = Cookies.get("device_id");

  if (!deviceId) {
    deviceId = uuidv4();
    Cookies.set("device_id", deviceId, {
      expires: 365,
      secure: true,
      sameSite: "Strict",
    });

    console.log(`🆕 New device_id generated and stored: ${deviceId}`);
    // Optional: log to your own analytics or tracking system here
  } else {
    console.log(`✅ Existing device_id found: ${deviceId}`);
  }

  return deviceId;
}
