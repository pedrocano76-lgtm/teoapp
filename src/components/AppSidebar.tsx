import { useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Users, LogOut, ChevronDown, Home } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AddChildDialog } from './AddChildDialog';
import { ChildrenManager } from './ChildrenManager';
import { SettingsPanel } from './SettingsPanel';
import { FamilySection } from './FamilySection';
import { Child } from '@/lib/types';
import { BrandLogo, BrandWordmark } from './Brand';

interface AppSidebarProps {
  children: Child[];
  onSelectChild: (id: string | null) => void;
  selectedChildId: string | null;
  duplicateFinderSlot?: ReactNode;
}

export function AppSidebar({ children: childrenList, onSelectChild, selectedChildId, duplicateFinderSlot }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const homeActive = !selectedChildId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <button onClick={() => onSelectChild(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BrandLogo size={26} />
          <BrandWordmark className="text-lg group-data-[collapsible=icon]:hidden" style={{ fontSize: 18, lineHeight: 1 }} />
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-2">
        {/* Section 1 — Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onSelectChild(null)}
                isActive={homeActive}
                className="relative data-[active=true]:bg-transparent hover:bg-sidebar-accent/60"
                style={
                  homeActive
                    ? { borderLeft: '3px solid #C8845A', paddingLeft: 9, color: '#C8845A', fontWeight: 600 }
                    : { borderLeft: '3px solid transparent', paddingLeft: 9 }
                }
              >
                <Home className="h-4 w-4" />
                <span>{t('nav.home')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Section 2 — Children */}
        <SidebarGroup>
          <p
            className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] group-data-[collapsible=icon]:hidden"
            style={{ color: '#9A8A7A' }}
          >
            {t('nav.children')}
          </p>
          <SidebarGroupContent>
            <ChildrenManager children={childrenList} onSelectChild={onSelectChild} />
            <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
              <AddChildDialog />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section 3 — Family (collapsed by default) */}
        <Collapsible defaultOpen={false}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <button
                className="w-full px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] flex items-center justify-between group-data-[collapsible=icon]:hidden hover:opacity-80 transition-opacity"
                style={{ color: '#9A8A7A' }}
              >
                <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {t('nav.family')}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <FamilySection />
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Inline Settings expandable content (controlled by footer link) */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SettingsPanel toolsSlot={duplicateFinderSlot} />
              </SidebarGroupContent>
            </SidebarGroup>
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>

      {/* Section 4 — Footer */}
      <SidebarFooter
        className="p-3 mt-auto gap-1.5"
        style={{ borderTop: '1px solid #E0D8CC' }}
      >
        <p
          className="text-[11px] truncate group-data-[collapsible=icon]:hidden"
          style={{ color: '#9A8A7A' }}
        >
          {user?.email}
        </p>
        <button
          type="button"
          onClick={() => setSettingsOpen(o => !o)}
          className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity w-full py-1"
          style={{ color: '#7A6A5A' }}
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">{t('nav.settings')}</span>
        </button>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity w-full py-1"
          style={{ color: '#7A6A5A' }}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">{t('nav.signOut')}</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
