import { Button } from '@agent-rooms/ui-library/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@agent-rooms/ui-library/components/dropdown-menu'
import { Kbd, KbdGroup } from '@agent-rooms/ui-library/components/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@agent-rooms/ui-library/components/sidebar'
import { Skeleton } from '@agent-rooms/ui-library/components/skeleton'
import { useTheme } from '@agent-rooms/ui-library/components/theme-provider'
import { Monitor, Moon, Search, Settings2, Sun } from '@agent-rooms/ui-library/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { RiGithubFill } from 'react-icons/ri'

import { externalLinks } from './config'
import { roomOverviewsQueryOptions } from './queries'
import { isSearchShortcut } from './room-navigation'
import { RoomSearch } from './room-search'
import {
  defaultSidebarFilters,
  filterRooms,
  getRoomGroups,
  type RoomActivityFilter,
  type RoomGroupBy,
  type RoomStatusFilter,
  type SidebarFilters,
} from './sidebar-domain'

const statusOptions: Array<{ value: RoomStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
]

const activityOptions: Array<{ value: RoomActivityFilter; label: string }> = [
  { value: '1d', label: '1d' },
  { value: '3d', label: '3d' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
]

const groupOptions: Array<{ value: RoomGroupBy; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'status', label: 'Status' },
  { value: 'none', label: 'None' },
]

export function RoomSidebar() {
  const [filters, setFilters] = useState<SidebarFilters>(defaultSidebarFilters)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const rooms = useQuery(roomOverviewsQueryOptions)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const visibleRooms = filterRooms(rooms.data ?? [], filters)
  const roomGroups = getRoomGroups(visibleRooms, filters.groupBy)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSearchShortcut(event)) return

      event.preventDefault()
      setIsSearchOpen((current) => !current)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function updateFilter<Key extends keyof SidebarFilters>(key: Key, value: SidebarFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3 px-3 py-4">
        <div className="flex items-center justify-between px-2">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Agent Rooms
          </Link>
          <RoomFilters
            filters={filters}
            onChange={updateFilter}
            onReset={() => setFilters(defaultSidebarFilters)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="items-center justify-between"
          aria-label="Search rooms and messages"
          onClick={() => setIsSearchOpen(true)}
        >
          <div className="flex items-center gap-1.5">
            <Search aria-hidden="true" />
            Search...
          </div>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
        <RoomSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1 px-3 py-1">
          <SidebarGroupContent className="min-h-0">
            {rooms.isPending ? <RoomListSkeleton /> : null}
            {rooms.isError ? (
              <p className="text-destructive px-2 py-3 text-sm">Could not load rooms.</p>
            ) : null}
            {rooms.data && visibleRooms.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-sm">
                {rooms.data.length === 0 ? 'No rooms yet.' : 'No rooms match these filters.'}
              </p>
            ) : null}
            {roomGroups.map((group) => (
              <div key={group.heading ?? 'rooms'} className="pb-2 last:pb-0">
                {group.heading ? (
                  <SidebarGroupLabel className="h-auto px-2 py-2 font-normal tracking-wide">
                    {group.heading}
                  </SidebarGroupLabel>
                ) : null}
                <SidebarMenu>
                  {group.rooms.map((overview) => {
                    const roomPath = `/rooms/${overview.room.id}`

                    return (
                      <SidebarMenuItem key={overview.room.id}>
                        <SidebarMenuButton
                          isActive={pathname === roomPath}
                          tooltip={overview.room.name}
                          render={
                            <Link to="/rooms/$roomId" params={{ roomId: overview.room.id }} />
                          }
                          className="h-8 gap-2 px-2.5 py-1"
                        >
                          <span className="min-w-0 flex-1 truncate">{overview.room.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border flex-row items-center gap-1 border-t px-3 py-2">
        <Button
          render={<a href={externalLinks.github} target="_blank" rel="noreferrer" />}
          variant="outline"
          size="icon-sm"
          aria-label="Open GitHub"
        >
          <RiGithubFill aria-hidden="true" />
        </Button>
        <ThemeSelector />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function RoomFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: SidebarFilters
  onChange: <Key extends keyof SidebarFilters>(key: Key, value: SidebarFilters[Key]) => void
  onReset: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="icon" aria-label="Filter rooms">
            <Settings2 aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        <FilterSubmenu
          label="Status"
          value={filters.status}
          options={statusOptions}
          onValueChange={(value) => onChange('status', value as RoomStatusFilter)}
        />
        <FilterSubmenu
          label="Last activity"
          value={filters.lastActivity}
          options={activityOptions}
          onValueChange={(value) => onChange('lastActivity', value as RoomActivityFilter)}
        />
        <DropdownMenuSeparator />
        <FilterSubmenu
          label="Group by"
          value={filters.groupBy}
          options={groupOptions}
          onValueChange={(value) => onChange('groupBy', value as RoomGroupBy)}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset}>Reset to defaults</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterSubmenu({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="[&>svg:last-child]:ml-1">
        <span>{label}</span>
        <span className="ml-auto text-xs">{selectedLabel}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-36 rounded-xl">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

const themes = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const

function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="icon-sm" aria-label="Change theme">
            <Sun className="scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Change theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-32 rounded-xl">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {themes.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RoomListSkeleton() {
  return (
    <div className="space-y-1" aria-label="Loading rooms" aria-busy="true">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="px-2 py-2">
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}
