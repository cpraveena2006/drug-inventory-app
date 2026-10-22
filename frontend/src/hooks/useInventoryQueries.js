import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "../services/incidents";
import { notificationService } from "../services/notifications";
import { portalService } from "../services/portal";
import { requestService } from "../services/requests";
import { insightService } from "../services/insights";
import { supplierService } from "../services/suppliers";

export function useIncidents(params) {
  return useQuery({ queryKey: ["incidents", params], queryFn: () => incidentService.list(params) });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: notificationService.list });
}

export function useRequests() {
  return useQuery({ queryKey: ["requests"], queryFn: requestService.list });
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: supplierService.list });
}

export function usePortalInbox() {
  return useQuery({ queryKey: ["portal-inbox"], queryFn: portalService.inbox });
}

export function useDrugInsights(id) {
  return useQuery({ queryKey: ["drug-insights", id], queryFn: () => insightService.drug(id), enabled: Boolean(id) });
}

export function useBatchDetails(id) {
  return useQuery({ queryKey: ["batch-details", id], queryFn: () => insightService.batch(id), enabled: Boolean(id) });
}

export function useSupplierScorecard(id) {
  return useQuery({ queryKey: ["supplier-scorecard", id], queryFn: () => insightService.supplier(id), enabled: Boolean(id) });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
