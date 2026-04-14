import { useState } from 'react';
import { useTags, useAddTag } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
}

export function TagSelector({ selectedTagIds, onToggle }: TagSelectorProps) {
  const { data: tags } = useTags();
  const addTag = useAddTag();
  const [newTag, setNewTag] = useState('');

  const handleAddCustom = async () => {
    if (!newTag.trim()) return;
    try {
      const created = await addTag.mutateAsync({ name: newTag.trim() });
      if (created) onToggle(created.id);
      setNewTag('');
    } catch {
      // Tag might already exist
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Etiquetas (opcional)</p>
      <div className="flex flex-wrap gap-1.5">
        {(tags || []).map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
              selectedTagIds.includes(tag.id)
                ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            )}
          >
            <span>{tag.icon}</span>
            {tag.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Añadir etiqueta..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          className="text-sm h-8"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAddCustom} disabled={!newTag.trim()}>
          Añadir
        </Button>
      </div>
    </div>
  );
}
