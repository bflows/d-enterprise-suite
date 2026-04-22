import { apiClient } from "@/lib/api/client";
import type { AuthenticatedUser } from "@/types/auth";

export interface TimeCardDto {
  id: string;
  userId: string;
  companyId: string;
  clockedInAt: string;
  clockedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClockEventPayload {
  /** ISO 8601 from the client when the user tapped clock in/out */
  clientTimestamp: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  company: {
    id: string;
    name: string;
  };
}

function buildClockPayload(
  user: AuthenticatedUser,
  company: { id: string; name: string }
): ClockEventPayload {
  return {
    clientTimestamp: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    company: { id: company.id, name: company.name },
  };
}

export async function getActiveTimeCard(): Promise<TimeCardDto | null> {
  const { data } = await apiClient.get<{
    success: true;
    data: { activeTimeCard: TimeCardDto | null };
  }>("/api/time-cards/active");
  return data.data.activeTimeCard;
}

/** Time Cards for the current user at the current company (clockedInAt in the last 7 days). */
export async function getRecentTimeCards(): Promise<TimeCardDto[]> {
  const { data } = await apiClient.get<{
    success: true;
    data: { timeCards: TimeCardDto[] };
  }>("/api/time-cards/recent");
  return data.data.timeCards;
}

export async function clockIn(
  user: AuthenticatedUser,
  company: { id: string; name: string }
): Promise<TimeCardDto> {
  const { data } = await apiClient.post<{
    success: true;
    data: { timeCard: TimeCardDto };
  }>("/api/time-cards/clock-in", buildClockPayload(user, company));
  return data.data.timeCard;
}

export async function clockOut(
  user: AuthenticatedUser,
  company: { id: string; name: string }
): Promise<TimeCardDto> {
  const { data } = await apiClient.post<{
    success: true;
    data: { timeCard: TimeCardDto };
  }>("/api/time-cards/clock-out", buildClockPayload(user, company));
  return data.data.timeCard;
}
