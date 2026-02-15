import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useLoginModal } from "../useLoginModal.js";
import { LoginModalProvider } from "@/context/LoginModalContext.jsx";

const wrapper = ({ children }) => (
  <LoginModalProvider>{children}</LoginModalProvider>
);

describe("useLoginModal", () => {
  it("starts with modal closed", () => {
    const { result } = renderHook(() => useLoginModal(), { wrapper });
    expect(result.current.isLoginModalOpen).toBe(false);
  });

  it("opens and closes modal", () => {
    const { result } = renderHook(() => useLoginModal(), { wrapper });

    act(() => result.current.openLoginModal());
    expect(result.current.isLoginModalOpen).toBe(true);

    act(() => result.current.closeLoginModal());
    expect(result.current.isLoginModalOpen).toBe(false);
  });
});
