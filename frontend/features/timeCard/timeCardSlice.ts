import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "@/app/store";
import * as timeCardsApi from "@/lib/api/timeCards";
import type { TimeCardDto } from "@/lib/api/timeCards";
import type { AuthenticatedUser } from "@/types/auth";
import { ROLE_SLUGS } from "@/types/auth";
import { authSlice, logout } from "@/features/auth/authSlice";

export interface TimeCardState {
  /** Open time card for the current company context, if any. */
  activeTimeCard: TimeCardDto | null;
  /** Initial load of active card (e.g. on dashboard). */
  isFetchingActive: boolean;
  /** Clock in / clock out request in flight. */
  isClockActionPending: boolean;
  /** Last error from fetch or clock action. */
  error: string | null;
}

const initialState: TimeCardState = {
  activeTimeCard: null,
  isFetchingActive: false,
  isClockActionPending: false,
  error: null,
};

function clockErrorMessage(err: unknown): string {
  if (
    axios.isAxiosError(err) &&
    err.response?.data &&
    typeof err.response.data === "object" &&
    "message" in err.response.data &&
    typeof (err.response.data as { message: unknown }).message === "string"
  ) {
    return (err.response.data as { message: string }).message;
  }
  return "Clock action failed. Try again.";
}

export const fetchActiveTimeCard = createAsyncThunk(
  "timeCard/fetchActive",
  async (_, { rejectWithValue }) => {
    try {
      return await timeCardsApi.getActiveTimeCard();
    } catch {
      return rejectWithValue("Could not load clock status.");
    }
  }
);

export const clockInUser = createAsyncThunk(
  "timeCard/clockIn",
  async (
    payload: {
      user: AuthenticatedUser;
      company: { id: string; name: string };
    },
    { rejectWithValue }
  ) => {
    try {
      const card = await timeCardsApi.clockIn(payload.user, payload.company);
      return card;
    } catch (err: unknown) {
      return rejectWithValue(clockErrorMessage(err));
    }
  }
);

export const clockOutUser = createAsyncThunk(
  "timeCard/clockOut",
  async (
    payload: {
      user: AuthenticatedUser;
      company: { id: string; name: string };
    },
    { rejectWithValue }
  ) => {
    try {
      await timeCardsApi.clockOut(payload.user, payload.company);
      return null as TimeCardDto | null;
    } catch (err: unknown) {
      return rejectWithValue(clockErrorMessage(err));
    }
  }
);

const slice = createSlice({
  name: "timeCard",
  initialState,
  reducers: {
    clearTimeCardState() {
      return initialState;
    },
    /** Optional: sync from elsewhere without a full fetch. */
    setActiveTimeCard(state, action: PayloadAction<TimeCardDto | null>) {
      state.activeTimeCard = action.payload;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveTimeCard.pending, (state) => {
        state.isFetchingActive = true;
        state.error = null;
      })
      .addCase(fetchActiveTimeCard.fulfilled, (state, action) => {
        state.isFetchingActive = false;
        state.activeTimeCard = action.payload;
        state.error = null;
      })
      .addCase(fetchActiveTimeCard.rejected, (state, action) => {
        state.isFetchingActive = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Could not load clock status.";
      })
      .addCase(clockInUser.pending, (state) => {
        state.isClockActionPending = true;
        state.error = null;
      })
      .addCase(clockInUser.fulfilled, (state, action) => {
        state.isClockActionPending = false;
        state.activeTimeCard = action.payload;
        state.error = null;
      })
      .addCase(clockInUser.rejected, (state, action) => {
        state.isClockActionPending = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Clock in failed.";
      })
      .addCase(clockOutUser.pending, (state) => {
        state.isClockActionPending = true;
        state.error = null;
      })
      .addCase(clockOutUser.fulfilled, (state) => {
        state.isClockActionPending = false;
        state.activeTimeCard = null;
        state.error = null;
      })
      .addCase(clockOutUser.rejected, (state, action) => {
        state.isClockActionPending = false;
        state.error =
          (action.payload as string | undefined) ??
          action.error.message ??
          "Clock out failed.";
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(authSlice.actions.clearSession, () => initialState);
  },
});

export const timeCardSlice = slice;
export const timeCardReducer = slice.reducer;
export const { clearTimeCardState, setActiveTimeCard } = slice.actions;

export const selectActiveTimeCard = (state: RootState) =>
  state.timeCard.activeTimeCard;

export const selectIsClockedIn = (state: RootState): boolean => {
  const card = state.timeCard.activeTimeCard;
  return Boolean(card && !card.clockedOutAt);
};

/** Open time card for a technician in the current company context (for feature gating). */
export const selectIsClockedInTechnician = (state: RootState): boolean => {
  if (state.auth.user?.role !== ROLE_SLUGS.TECHNICIAN) return false;
  return selectIsClockedIn(state);
};

export const selectClockedInAt = (state: RootState): string | null =>
  state.timeCard.activeTimeCard?.clockedInAt ?? null;

export const selectTimeCardFetching = (state: RootState) =>
  state.timeCard.isFetchingActive;

export const selectTimeCardClockActionPending = (state: RootState) =>
  state.timeCard.isClockActionPending;

export const selectTimeCardError = (state: RootState) => state.timeCard.error;
