import { useQuery } from '@tanstack/react-query';
import { getMyRole } from '@/zite/api';
import { useAuth } from '@/zite/auth';
export function useRole() {
    const { user } = useAuth();
    const { data, isLoading } = useQuery({ queryKey: ['myRole'], queryFn: () => getMyRole({}), staleTime: 5 * 60_000 });
    const isDefaultAdmin = user?.email?.trim().toLowerCase() === 'kimsegarra4@gmail.com';
    const role = isDefaultAdmin ? 'Admin' : (data?.role ?? 'None');
    const permissions = data?.permissions ?? [];
    return {
        role,
        permissions,
        isAdmin: role === 'Admin',
        isEditor: role === 'Editor',
        canEditTable: (table) => role === 'Admin' || (role === 'Editor' && (table === 'attendance' ? permissions.includes('attendance') : table === 'cashAdvances' ? permissions.includes('cashAdvances') : false)),
        hasModule: (permission) => role === 'Admin' || role === 'Viewer' || (role === 'Editor' && permissions.includes(permission)),
        isLoading,
    };
}
