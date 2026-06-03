// Order list with filters (status, date range)
// useQuery with /api/admin/orders
// Click row opens <OrderDetail> modal with full order info and actions.

const setFinalPrice = useMutation({
  mutationFn: ({ orderId, itemId, final_price }) =>
    apiClient.put(`/api/admin/orders/${orderId}/items/${itemId}/final-price`, { final_price }),
  onSuccess: () => queryClient.invalidateQueries(['admin-orders']),
});

const updateStatus = useMutation({
  mutationFn: ({ orderId, status }) =>
    apiClient.put(`/api/admin/orders/${orderId}/status`, { status }),
  onSuccess: () => queryClient.invalidateQueries(['admin-orders']),
});

