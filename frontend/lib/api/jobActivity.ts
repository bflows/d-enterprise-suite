import { apiClient } from "@/lib/api/client";

export interface JobActivityUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface JobActivityRow {
  id: string;
  jobId: string;
  companyId: string;
  logName: string;
  userId: string | null;
  createdAt: string;
  user: JobActivityUser | null;
}

export interface ListJobActivitiesResponse {
  activities: JobActivityRow[];
}

/** POST /api/job-activity/list — body matches other company-scoped job APIs (e.g. technician jobs). */
export async function listJobActivities(
  companyId: string,
  jobId: string
): Promise<JobActivityRow[]> {
  const { data } = await apiClient.post<ListJobActivitiesResponse>("/api/job-activity/list", {
    companyId,
    jobId,
  });
  return data.activities;
}
