import { LayoutDashboard, Clock, Settings, LogOut } from 'lucide-react';
import { Badge } from 'poyraz-ui/atoms';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from 'poyraz-ui/organisms';
import { View, useNavigationStore } from '~/stores/navigation.store';
import { useAuthStore } from '~/stores/auth.store';
import vocaLogo from '~/assets/voca_logo.png';

interface AppSidebarProps {
  transcriptCount: number;
}

const menuItems: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'history', label: 'History', icon: <Clock size={18} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

export const AppSidebar = ({ transcriptCount }: AppSidebarProps) => {
  const { view, setView } = useNavigationStore();
  const { user, clearAuth } = useAuthStore();

  return (
    <Sidebar variant="bordered" className="border-0 border-r-2 border-dashed border-slate-300">
      <SidebarHeader className="h-16 py-0 px-4">
        <img src={vocaLogo} alt="Voca" className="w-11 h-11 rounded-full" />
        <h1 className="text-lg font-bold text-[#171717]">Voca</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.key}
              active={view === item.key}
              icon={item.icon}
              badge={
                item.key === 'history' && transcriptCount > 0 ? (
                  <Badge variant="secondary">{transcriptCount}</Badge>
                ) : undefined
              }
              onClick={() => setView(item.key)}
            >
              {item.label}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-medium text-neutral-600">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#171717] truncate">{user?.name}</p>
              <p className="text-xs text-[#737373] truncate">{user?.email}</p>
            </div>
            <button
              onClick={clearAuth}
              className="p-1 text-[#737373] hover:text-[#171717] transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
