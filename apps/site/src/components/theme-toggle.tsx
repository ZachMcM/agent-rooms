'use client'

import { ToggleGroup, ToggleGroupItem } from '@coordrooms/ui-library/components/toggle-group'
import { useTheme } from 'fumadocs-ui/provider/base'
import { Laptop, MoonStar, Sun } from 'lucide-react'

const itemClassName =
  'text-muted-foreground border border-transparent px-2 data-[state=on]:border-border data-[state=on]:bg-background data-[state=on]:text-foreground'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      aria-label="Color theme"
      size="sm"
      spacing={1}
      className="bg-background/80 rounded-4xl border p-0.5"
      value={[theme ?? 'system']}
      onValueChange={(value) => {
        if (value[0]) {
          setTheme(value[0])
        }
      }}
    >
      <ToggleGroupItem
        type="button"
        value="system"
        aria-label="Use system theme"
        title="System"
        className={itemClassName}
      >
        <Laptop aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem
        type="button"
        value="light"
        aria-label="Use light theme"
        title="Light"
        className={itemClassName}
      >
        <Sun aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem
        type="button"
        value="dark"
        aria-label="Use dark theme"
        title="Dark"
        className={itemClassName}
      >
        <MoonStar aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
