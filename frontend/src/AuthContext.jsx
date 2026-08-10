import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getToken, setToken, clearToken, api } from "./api/client";

const AuthContext = createContext(null);

function decodeUserId(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const userId = useMemo(() => decodeUserId(token), [token]);

  const login = useCallback(async (email, password) => {
    const { access_token } = await api.login({ email, password });
    setToken(access_token);
    setTokenState(access_token);
  }, []);

  const requestRegisterCode = useCallback(async (display_name, email, password) => {
    await api.requestRegisterCode({ display_name, email, password });
  }, []);

  const verifyRegisterCode = useCallback(async (email, code) => {
    const { access_token } = await api.verifyRegisterCode({ email, code });
    setToken(access_token);
    setTokenState(access_token);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await api.forgotPassword({ email });
  }, []);

  const resetPassword = useCallback(async (email, code, new_password) => {
    const { access_token } = await api.resetPassword({ email, code, new_password });
    setToken(access_token);
    setTokenState(access_token);
  }, []);

  const loginWithTelegram = useCallback(async (tgData) => {
    const { access_token } = await api.telegramAuth(tgData);
    setToken(access_token);
    setTokenState(access_token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthed: !!token, userId, login, requestRegisterCode, verifyRegisterCode, forgotPassword, resetPassword, loginWithTelegram, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
