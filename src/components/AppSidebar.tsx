import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Baby, Settings, Users, LogOut, ChevronDown, Home } from 'lucide-react';
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

interface AppSidebarProps {
  children: Child[];
  onSelectChild: (id: string | null) => void;
  selectedChildId: string | null;
}

export function AppSidebar({ children: childrenList, onSelectChild, selectedChildId }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedChild = selectedChildId ? childrenList.find(c => c.id === selectedChildId) : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <button onClick={() => onSelectChild(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">📸</span>
          <span className="text-lg font-heading font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Little Moments</span>
        </button>
      </SidebarHeader>

      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => onSelectChild(null)} isActive={!selectedChildId}>
                <Home className="h-4 w-4" />
                <span>Inicio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Children */}
        <Collapsible defaultOpen>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Baby className="h-3.5 w-3.5" /> Hijos</span>
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

        {/* Family */}
        {selectedChild && (
          <Collapsible defaultOpen>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Familia</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <FamilySection childId={selectedChild.id} childName={selectedChild.name} />
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Configuración</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
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
          <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
