import { useSyncExternalStore } from "react";
import { getApiAvailability, subscribeApiAvailability } from "../services/api.js";

export default function useApiAvailability() {
  return useSyncExternalStore(subscribeApiAvailability, getApiAvailability);
}
