import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Settings, LogOut, UserCircle2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { AddChildDialog } from './AddChildDialog';
import { ChildrenManager } from './ChildrenManager';
import { UserProfileModal } from './UserProfileModal';
import { Child } from '@/lib/types';
import { BrandLogo, BrandWordmark } from './Brand';

interface AppSidebarProps {
  children: Child[];
  onSelectChild: (id: string | null) => void;
  selectedChildId: string | null;
}

export function AppSidebar({ children: childrenList, onSelectChild, selectedChildId }: AppSidebarProps) {
  const { user, signOut, displayName } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <Sidebar collapsible="icon">
      {/* Top — wordmark */}
      <SidebarHeader className="p-4">
        <button
          onClick={() => onSelectChild(null)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <BrandLogo size={32} />
          <BrandWordmark
            className="text-lg group-data-[collapsible=icon]:hidden"
            style={{ fontSize: 18, lineHeight: 1 }}
          />
        </button>
      </SidebarHeader>

      {/* Children list — direct nav items */}
      <SidebarContent className="gap-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <ChildrenManager
              children={childrenList}
              onSelectChild={onSelectChild}
              selectedChildId={selectedChildId}
            />
            <div className="px-3 pt-3 group-data-[collapsible=icon]:hidden">
              <AddChildDialog
                trigger={
                  <button
                    type="button"
                    className="text-xs hover:underline underline-offset-2 transition-opacity"
                    style={{ color: '#7A6A5A' }}
                  >
                    + {t('child.addChild', { defaultValue: 'Añadir hijo' }).replace(/^[^\p{L}]+/u, '')}
                  </button>
                }
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — pinned to bottom */}
      <SidebarFooter
        className="p-3 mt-auto gap-2"
        style={{ borderTop: '1px solid #E0D8CC' }}
      >
        <p
          className="text-[11px] truncate group-data-[collapsible=icon]:hidden"
          style={{ color: '#9A8A7A' }}
          title={user?.email ?? undefined}
        >
          {user?.email}
        </p>
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={t('profile.title', { defaultValue: 'Tu cuenta' })}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            style={{ color: '#7A6A5A' }}
          >
            <UserCircle2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label={t('nav.settings')}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            style={{ color: '#7A6A5A' }}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label={t('nav.signOut')}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors ml-auto group-data-[collapsible=icon]:ml-0"
            style={{ color: '#7A6A5A' }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>

      <UserProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </Sidebar>
  );
}
