import { LogOut, Search, Download, Tag } from 'lucide-react'
import { useState } from 'react'
import { FolderTree } from '@/components/folders/FolderTree'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { TagManager } from '@/components/tags/TagManager'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  selectedFolderId: string | null
  onFolderSelect: (id: string | null) => void
  onSearch: (query: string) => void
  onImportClick?: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  isTrashSelected?: boolean
  onTrashSelect?: () => void
}

export function Sidebar({ selectedFolderId, onFolderSelect, onSearch, onImportClick, searchInputRef, isTrashSelected, onTrashSelect }: SidebarProps) {
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search"
            className={cn(
              'w-full pl-9 pr-3 py-2 text-sm text-foreground',
              'bg-background/80 rounded-lg',
              'border-none outline-none',
              'focus:ring-2 focus:ring-primary/20',
              'placeholder:text-muted-foreground'
            )}
          />
        </div>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-hidden">
        <FolderTree
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          isTrashSelected={isTrashSelected}
          onTrashSelect={onTrashSelect}
        />
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2 space-y-2">
        <button
          onClick={() => setIsTagManagerOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
            'bg-background/80 text-foreground hover:bg-background transition-colors',
            'border border-border'
          )}
        >
          <Tag className="w-4 h-4" />
          Manage Tags
        </button>
        <button
          onClick={onImportClick}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
            'bg-background/80 text-foreground hover:bg-background transition-colors',
            'border border-border'
          )}
        >
          <Download className="w-4 h-4" />
          Import
        </button>
      </div>

      {/* Tag Manager Dialog */}
      <TagManager open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen} />

      {/* User section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate flex-1">
            {user?.email}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
