import { useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Baby, Settings, Users, LogOut, ChevronDown, Home, Copy } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { AddChildDialog } from './AddChildDialog';
import { ChildrenManager } from './ChildrenManager';
import { SettingsPanel } from './SettingsPanel';
import { FamilySection } from './FamilySection';
import { Child } from '@/lib/types';
import { BrandLogo, BrandWordmark } from './Brand';
import { LanguageToggle } from './LanguageToggle';

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <button onClick={() => onSelectChild(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BrandLogo size={26} />
          <BrandWordmark className="text-lg group-data-[collapsible=icon]:hidden" style={{ fontSize: 18, lineHeight: 1 }} />
        </button>
      </SidebarHeader>

      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => onSelectChild(null)} isActive={!selectedChildId}>
                <Home className="h-4 w-4" />
                <span>{t('nav.home')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Family (top level) */}
        <Collapsible defaultOpen>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t('nav.family')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <FamilySection />
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Children */}
        <Collapsible defaultOpen>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Baby className="h-3.5 w-3.5" /> {t('nav.children')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <ChildrenManager children={childrenList} onSelectChild={onSelectChild} />
                <div className="px-2 pt-2">
                  <AddChildDialog />
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>



        {/* Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> {t('nav.settings')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                {duplicateFinderSlot && (
                  <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
                    {duplicateFinderSlot}
                  </div>
                )}
                <SettingsPanel />
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">{t('nav.signOut')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
