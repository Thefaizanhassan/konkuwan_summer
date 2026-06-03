import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../services/api';

export default function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });
}