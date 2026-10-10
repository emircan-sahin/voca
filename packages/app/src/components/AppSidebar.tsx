import { useState } from 'react';
import { LayoutDashboard, Clock, Settings, LogOut } from 'lucide-react';
import { Badge } from 'poyraz-ui/atoms';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'poyraz-ui/molecules';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from 'poyraz-ui/organisms';
import { useTranslation } from 'react-i18next';
import { APP_LOCALES, AppLocale } from '@voca/shared';
import { View, useNavigationStore } from '~/stores/navigation.store';
import { useAuthStore } from '~/stores/auth.store';
import { useProgramLanguageStore } from '~/stores/programLanguage.store';
import vocaLogo from '~/assets/voca_logo.png';

interface AppSidebarProps {
  transcriptCount: number;
  hasMoreTranscripts: boolean;
  appVersion: string | null;
}

const MENU_KEYS: { key: View; i18nKey: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', i18nKey: 'sidebar.dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'history', i18nKey: 'sidebar.history', icon: <Clock size={18} /> },
  { key: 'settings', i18nKey: 'sidebar.settings', icon: <Settings size={18} /> },
  // { key: 'billing', i18nKey: 'sidebar.billing', icon: <CreditCard size={18} /> },
];

// Paid plans are disabled, so the plan badge is hidden.
// function planBadgeStyle(plan: string | null): { label: string; bg: string; text: string } {
//   if (plan === 'max') return { label: 'Max', bg: '#dc2626', text: '#fff' };
//   if (plan === 'pro') return { label: 'Pro', bg: '#f59e0b', text: '#fff' };
//   return { label: 'Free', bg: '#e5e5e5', text: '#737373' };
// }

// Guards against malformed addresses (no '@' or no TLD) that would otherwise crash the sidebar render.
function maskEmail(email: string): string {
  const [local, domain = ''] = email.split('@');
  const dot = domain.lastIndexOf('.');
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const ext = dot > 0 ? domain.slice(dot) : '';
  return `${local.slice(0, 2)}***@${name.slice(0, 2)}***${ext}`;
}

const PLATFORM_LABELS: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
};

const LOCALE_LABELS: Record<AppLocale, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  es: { flag: '🇪🇸', label: 'Español' },
  hi: { flag: '🇮🇳', label: 'हिन्दी' },
  zh: { flag: '🇨🇳', label: '中文' },
  de: { flag: '🇩🇪', label: 'Deutsch' },
  pt: { flag: '🇧🇷', label: 'Português' },
  ja: { flag: '🇯🇵', label: '日本語' },
  fr: { flag: '🇫🇷', label: 'Français' },
  tr: { flag: '🇹🇷', label: 'Türkçe' },
  ru: { flag: '🇷🇺', label: 'Русский' },
  ko: { flag: '🇰🇷', label: '한국어' },
  it: { flag: '🇮🇹', label: 'Italiano' },
};

export const AppSidebar = ({ transcriptCount, hasMoreTranscripts, appVersion }: AppSidebarProps) => {
  const { t } = useTranslation();
  const { view, setView } = useNavigationStore();
  const { user, clearAuth } = useAuthStore();
  const { programLanguage, setProgramLanguage } = useProgramLanguageStore();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const platformLabel = PLATFORM_LABELS[window.electronAPI.platform] ?? window.electronAPI.platform;

  return (
    <Sidebar variant="bordered" className="border-0 border-r-2 border-dashed border-slate-300">
      <SidebarHeader className="h-16 py-0 px-3">
        <img src={vocaLogo} alt="Voca" className="w-11 h-11 rounded-full" />
        <h1 className="text-lg font-bold text-[#171717]">Voca</h1>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarMenu>
          {MENU_KEYS.map((item) => (
            <SidebarMenuItem
              key={item.key}
              active={view === item.key}
              icon={item.icon}
              badge={
                item.key === 'history' && transcriptCount > 0 ? (
                  <Badge variant="secondary">
                    {transcriptCount}
                    {hasMoreTranscripts && '+'}
                  </Badge>
                ) : undefined
              }
              onClick={() => setView(item.key)}
            >
              {t(item.i18nKey)}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <div className="flex items-center justify-between px-3 pb-2">
        {appVersion ? (
          <button
            onClick={() => window.electronAPI.updater.checkForUpdates()}
            className="text-[10px] text-[#a3a3a3] hover:text-[#737373] transition-colors text-left cursor-pointer"
          >
            v{appVersion} · {platformLabel}
          </button>
        ) : (
          <span />
        )}
        <Select value={programLanguage} onValueChange={(v) => setProgramLanguage(v as AppLocale)}>
          <SelectTrigger
            aria-label={t('sidebar.language')}
            className="h-7 w-auto justify-end gap-1 px-1.5 text-xs border-0 shadow-none text-[#a3a3a3] hover:text-[#737373]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APP_LOCALES.map((code) => {
              const loc = LOCALE_LABELS[code];
              return (
                <SelectItem key={code} value={code}>
                  {loc.flag} {loc.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <SidebarFooter>
        {user && (() => {
          // const badge = planBadgeStyle(user.plan ?? null);
          return (
            <div className="px-0 py-0">
              <div className="flex items-center gap-2">
                {user.avatarUrl && !avatarFailed ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-medium text-neutral-600">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {/* <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-wide leading-none px-1.5 py-0.5 rounded mb-0.5"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span> */}
                  <p className="text-sm font-medium text-[#171717] truncate">{user.name}</p>
                  <p className="text-xs text-[#737373] truncate">
                    {maskEmail(user.email)}
                  </p>
                </div>
                <button
                  onClick={() => clearAuth()}
                  className="p-1 text-[#737373] hover:text-[#171717] transition-colors"
                  title={t('sidebar.signOut')}
                  aria-label={t('sidebar.signOut')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          );
        })()}
      </SidebarFooter>
    </Sidebar>
  );
};
