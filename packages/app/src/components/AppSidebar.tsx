import { LayoutDashboard, Clock, Settings } from 'lucide-react';
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
          <p className="text-xs text-[#737373]">Voca v0.0.1</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
