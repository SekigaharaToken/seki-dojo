import { useContext } from "react";
import FarcasterContext from "@/context/farcasterContext.js";

export const useFarcaster = () => {
  const context = useContext(FarcasterContext);
  if (!context) {
    return { isAuthenticated: false, profile: null };
  }
  return context;
};
