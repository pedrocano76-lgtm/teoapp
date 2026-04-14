import { useState } from 'react';
import { useAddChild } from '@/hooks/useData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const colors = [
  { value: 'primary', label: '🌸 Rosa' },
  { value: 'sage', label: '🌿 Salvia' },
  { value: 'lavender', label: '💜 Lavanda' },
  { value: 'peach', label: '🍑 Melocotón' },
  { value: 'sky', label: '🩵 Cielo' },
];

export function AddChildDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [color, setColor] = useState('primary');
  const addChild = useAddChild();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addChild.mutateAsync({ name, birth_date: birthDate, color });
      toast({ title: '🎉 ¡Añadido!', description: `${name} se ha añadido a tu álbum.` });
      setOpen(false);
      setName('');
      setBirthDate('');
      setColor('primary');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          👶 Añadir hijo/a
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Add a Child</DialogTitle>
          <DialogDescription>Add your child’s name, birth date, and album color.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Nombre del niño/a"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={addChild.isPending}>
            {addChild.isPending ? 'Añadiendo...' : 'Añadir hijo/a'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
