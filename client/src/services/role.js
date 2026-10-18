import { useQuery } from '@tanstack/react-query';
import { getMyRole } from '@/zite/api';
export function useRole() {
    const hasPreApprovedAdminSession = typeof window !== 'undefined'
        && window.localStorage.getItem('sahod_admin_session') === 'true';
    const { data, isLoading } = useQuery({
        queryKey: ['myRole', hasPreApprovedAdminSession],
        queryFn: () => hasPreApprovedAdminSession
            ? { role: 'Admin', permissions: [] }
            : getMyRole({}),
        staleTime: 5 * 60_000,
    });
    const role = data?.role ?? 'None';
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
