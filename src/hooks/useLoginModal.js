import { useContext } from "react";
import { LoginModalContext } from "@/context/LoginModalContext.jsx";

export const useLoginModal = () => {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error("useLoginModal must be used within LoginModalProvider");
  }
  return context;
};
