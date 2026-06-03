import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../services/api';

export default function useProducts(params = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params).then(res => res.data),
    keepPreviousData: true,
  });
}