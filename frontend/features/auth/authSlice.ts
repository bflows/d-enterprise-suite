import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { setAccessToken, clearAccessToken } from "@/lib/auth/tokenStore";
import * as authApi from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/types/auth";
import type { RoleSlug, EmploymentItem } from "@/types/auth";
import type { RootState } from "@/app/store";

export interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrationDone: boolean;
  error: string | null;
  /** Fetched from POST /api/auth/employment; used for role and company switcher. */
  employments: EmploymentItem[];
  /** Current company context from employment (used for employees list, etc.). */
  currentCompany: { id: string; name: string } | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  hydrationDone: false,
  error: null,
  employments: [],
  currentCompany: null,
};

// Thunks (must be defined before slice so extraReducers can reference them)
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: authApi.LoginCredentials) => {
    const res = await authApi.login(credentials);
    setAccessToken(res.accessToken);
    return res;
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (credentials: authApi.RegisterCredentials) => {
    const res = await authApi.register(credentials);
    setAccessToken(res.accessToken);
    return res;
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await authApi.logout();
  clearAccessToken();
});

export const refreshSession = createAsyncThunk(
  "auth/refreshSession",
  async () => {
    const res = await authApi.refresh();
    setAccessToken(res.accessToken);
    return res;
  }
);

export const getMe = createAsyncThunk("auth/getMe", () => authApi.getMe());

export const fetchEmployment = createAsyncThunk(
  "auth/fetchEmployment",
  () => authApi.getEmployment()
);

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Called by API client interceptor when refresh succeeds. */
    updateSession(
      state,
      action: PayloadAction<{ accessToken: string; user: AuthenticatedUser }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearSession(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.employments = [];
      state.currentCompany = null;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setHydrationDone(state, action: PayloadAction<boolean>) {
      state.hydrationDone = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Login failed";
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Registration failed";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.error = null;
        state.employments = [];
        state.currentCompany = null;
      })
      .addCase(refreshSession.pending, (state) => {
        if (!state.user) state.isLoading = true;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hydrationDone = true;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.isLoading = false;
        state.hydrationDone = true;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(fetchEmployment.fulfilled, (state, action) => {
        state.employments = action.payload.employments;
        state.currentCompany = action.payload.currentCompany ?? null;
        if (state.user != null && action.payload.currentRole != null) {
          state.user = { ...state.user, role: action.payload.currentRole };
        }
      });
  },
});

export const authSlice = slice;
export const authReducer = slice.reducer;

// Selectors
export const selectUser = (state: RootState) => state.auth.user;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectHydrationDone = (state: RootState) =>
  state.auth.hydrationDone;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectEmployments = (state: RootState) => state.auth.employments;
export const selectCurrentCompany = (state: RootState) =>
  state.auth.currentCompany;
export const selectCurrentCompanyId = (state: RootState) =>
  state.auth.currentCompany?.id ?? null;

export function selectHasRole(state: RootState, roleSlug: RoleSlug): boolean {
  const user = state.auth.user;
  return Boolean(user?.role === roleSlug);
}

export function selectHasAnyRole(
  state: RootState,
  roleSlugs: RoleSlug[]
): boolean {
  const user = state.auth.user;
  if (!user?.role) return false;
  return roleSlugs.includes(user.role as RoleSlug);
}
