import { apiClient } from "@/lib/api/client";
import type { Job, JobStatus } from "@/lib/calendar/types";

/** Request body for creating a job. */
export interface CreateJobBody {
  companyId: string;
  customerId: string;
  technicianId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime: string; // HH:mm
  endTime: string;
  notes?: string;
  leadSource?: string;
  /** Initial status; defaults to "scheduled" on the server if omitted. */
  status?: "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
  serviceItemIds?: string[];
}

/** API job response (Prisma include: customer, technician.user, services). */
export interface ApiJobResponse {
  id: string;
  companyId: string;
  customerId: string;
  technicianId: string;
  title: string | null;
  notes: string | null;
  leadSource: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  /** Job status from DB: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED */
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    address2?: string | null;
    city?: string | null;
    zipCode?: string | null;
    [key: string]: unknown;
  };
  technician: {
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  services?: Array<{
    id: string;
    title?: string;
    description?: string;
    unit?: number;
    price?: number;
    /** Mapped from API (title → name, unit → quantityOrUnit) */
    name?: string;
    quantity?: number;
  }>;
}

export interface CreateJobResponse {
  success: true;
  message: string;
  job: ApiJobResponse;
}

/** Request body for updating a job. Only provided fields are sent. */
export interface UpdateJobBody {
  id: string;
  title?: string | null;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  status?: "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
  technicianId?: string;
  /** Replace job's services with these service item IDs. */
  serviceItemIds?: string[];
}

export interface UpdateJobResponse {
  success: true;
  message: string;
  job: ApiJobResponse;
}

export interface ListJobsResponse {
  jobs: ApiJobResponse[];
}

export type JobPhotoSource = "camera_roll" | "live_camera" | "library";

export interface JobPhoto {
  id: string;
  jobId: string;
  companyId: string;
  uploadedBy: string;
  publicId: string;
  url: string;
  secureUrl: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListJobPhotosResponse {
  success: true;
  photos: JobPhoto[];
}

export interface UploadJobPhotoResponse {
  success: true;
  message: string;
  photo: JobPhoto;
}

/** Format ISO date/time from API to YYYY-MM-DD. */
function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Format ISO date/time from API to HH:mm. */
function toTimeKey(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const STATUS_MAP: Record<string, JobStatus> = {
  SCHEDULED: "scheduled",
  EN_ROUTE: "en_route",
  IN_PROGRESS: "in_progress",
  /** Backend maps API `in_progress` to Prisma ON_SITE */
  ON_SITE: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  INVOICED: "completed",
  PAID: "completed",
};

/** Map API job to frontend Job type for calendar/schedule. */
export function mapApiJobToJob(apiJob: ApiJobResponse): Job {
  const customerName = [apiJob.customer.firstName, apiJob.customer.lastName]
    .filter(Boolean)
    .join(" ") || apiJob.customer.email || apiJob.customer.phone || undefined;
  const technicianName = [
    apiJob.technician.user.firstName,
    apiJob.technician.user.lastName,
  ]
    .filter(Boolean)
    .join(" ") || apiJob.technician.user.email;
  const status: JobStatus =
    apiJob.status && STATUS_MAP[apiJob.status] ? STATUS_MAP[apiJob.status]! : "scheduled";
  return {
    id: apiJob.id,
    title: apiJob.title ?? undefined,
    date: toDateKey(apiJob.startDate),
    startTime: toTimeKey(apiJob.startTime),
    endTime: toTimeKey(apiJob.endTime),
    status,
    customerName: customerName ?? undefined,
    customerFirstName: apiJob.customer.firstName ?? undefined,
    customerLastName: apiJob.customer.lastName ?? undefined,
    customerPhone: apiJob.customer.phone ?? undefined,
    customerEmail: apiJob.customer.email ?? undefined,
    customerId: apiJob.customerId,
    address: apiJob.customer.address ?? undefined,
    address2: apiJob.customer.address2 ?? undefined,
    city: apiJob.customer.city ?? undefined,
    zipCode: apiJob.customer.zipCode ?? undefined,
    notes: apiJob.notes ?? undefined,
    technicianId: apiJob.technician.id,
    technicianName,
    serviceItemIds:
      apiJob.services && apiJob.services.length > 0
        ? apiJob.services.map((s) => s.id)
        : undefined,
    services:
      apiJob.services && apiJob.services.length > 0
        ? apiJob.services.map((s) => {
            const name = s.title ?? (s as { name?: string }).name ?? "";
            const quantity = s.unit ?? (s as { quantity?: number }).quantity ?? 0;
            const price = s.price ?? (s as { price?: number }).price ?? 0;
            return {
              id: s.id,
              name,
              description: s.description,
              quantity,
              price,
            };
          })
        : undefined,
  };
}

export async function createJob(
  body: CreateJobBody
): Promise<CreateJobResponse> {
  const { data } = await apiClient.post<CreateJobResponse>("/api/jobs/create", body);
  return data;
}

export async function updateJob(
  id: string,
  body: Omit<UpdateJobBody, "id">
): Promise<UpdateJobResponse> {
  const { data } = await apiClient.put<UpdateJobResponse>("/api/jobs/update", { ...body, id });
  return data;
}

export async function listJobs(): Promise<Job[]> {
  const { data } = await apiClient.get<ListJobsResponse>("/api/jobs");
  return data.jobs.map(mapApiJobToJob);
}

/** Jobs assigned to the signed-in technician for the current user + company. */
export async function listTechnicianJobs(
  userId: string,
  companyId: string
): Promise<Job[]> {
  const { data } = await apiClient.post<ListJobsResponse>("/api/jobs/technician", {
    userId,
    companyId,
  });
  return data.jobs.map(mapApiJobToJob);
}

/** Fetch a single job by id (uses listJobs and finds by id until a dedicated API exists). */
export async function getJobById(id: string): Promise<Job | null> {
  const jobs = await listJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export async function deleteJob(id: string): Promise<{ success: true; message: string }> {
  const { data } = await apiClient.delete<{ success: true; message: string }>("/api/jobs/delete", {
    data: { id },
  });
  return data;
}

/** Prisma-aligned job status for PUT /api/jobs/status */
export type ApiJobStatus =
  | "SCHEDULED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "COMPLETED"
  | "INVOICED"
  | "PAID"
  | "CANCELLED";

export async function updateJobStatus(
  id: string,
  status: ApiJobStatus
): Promise<UpdateJobResponse> {
  const { data } = await apiClient.put<UpdateJobResponse>("/api/jobs/status", { id, status });
  return data;
}

export async function listJobPhotos(jobId: string): Promise<JobPhoto[]> {
  const { data } = await apiClient.get<ListJobPhotosResponse>(`/api/jobs/${jobId}/photos`);
  return data.photos;
}

export async function uploadJobPhoto(
  jobId: string,
  file: File,
  source: JobPhotoSource
): Promise<JobPhoto> {
  const form = new FormData();
  form.append("file", file);
  form.append("source", source);
  const { data } = await apiClient.post<UploadJobPhotoResponse>(`/api/jobs/${jobId}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.photo;
}
