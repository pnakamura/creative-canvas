import React from 'react';
import { X, Settings2, Type, Sparkles, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFlowStore } from '@/store/flowStore';
import { cn } from '@/lib/utils';

export const PropertiesSidebar: React.FC = () => {
  const { nodes, selectedNodeId, setSelectedNode, updateNodeData } = useFlowStore();
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) return null;

  const { data } = selectedNode;

  const getNodeIcon = () => {
    switch (data.type) {
      case 'text': return Type;
      case 'assistant': return Sparkles;
      case 'imageGenerator': return Image;
      case 'videoGenerator': return Video;
      default: return Settings2;
    }
  };

  const getNodeColor = () => {
    switch (data.type) {
      case 'text': return 'text-handle-text';
      case 'assistant': return 'text-secondary';
      case 'imageGenerator': return 'text-handle-image';
      case 'videoGenerator': return 'text-accent';
      default: return 'text-primary';
    }
  };

  const Icon = getNodeIcon();

  const handleSettingsChange = (key: string, value: any) => {
    updateNodeData(selectedNodeId!, {
      settings: {
        ...data.settings,
        [key]: value,
      },
    });
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 glass-panel border-l border-border/50 z-40 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-md bg-background/50', getNodeColor())}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-foreground">{data.label}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedNode(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Common Properties */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Node ID
          </Label>
          <Input
            value={selectedNodeId || ''}
            disabled
            className="bg-background/50 border-border/50 text-sm font-mono"
          />
        </div>

        {/* Image Generator Settings */}
        {data.type === 'imageGenerator' && data.settings && (
          <>
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Aspect Ratio
              </Label>
              <Select
                value={data.settings.aspectRatio}
                onValueChange={(value) => handleSettingsChange('aspectRatio', value)}
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-panel border-border/50">
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Guidance Scale
                </Label>
                <span className="text-sm font-mono text-foreground">
                  {data.settings.guidanceScale}
                </span>
              </div>
              <Slider
                value={[data.settings.guidanceScale || 7.5]}
                onValueChange={([value]) => handleSettingsChange('guidanceScale', value)}
                min={1}
                max={20}
                step={0.5}
                className="py-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Steps
                </Label>
                <span className="text-sm font-mono text-foreground">
                  {data.settings.steps}
                </span>
              </div>
              <Slider
                value={[data.settings.steps || 30]}
                onValueChange={([value]) => handleSettingsChange('steps', value)}
                min={10}
                max={100}
                step={5}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Seed (Optional)
              </Label>
              <Input
                type="number"
                placeholder="Random"
                value={data.settings.seed || ''}
                onChange={(e) => handleSettingsChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-border/50"
              />
            </div>
          </>
        )}

        {/* Status Info */}
        <div className="pt-4 border-t border-border/50 space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Status
          </Label>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                data.isProcessing && 'bg-primary animate-pulse',
                data.isComplete && !data.isProcessing && 'bg-green-500',
                data.error && 'bg-destructive',
                !data.isProcessing && !data.isComplete && !data.error && 'bg-muted-foreground'
              )}
            />
            <span className="text-sm text-foreground/80">
              {data.isProcessing && 'Processing...'}
              {data.isComplete && !data.isProcessing && 'Complete'}
              {data.error && 'Error'}
              {!data.isProcessing && !data.isComplete && !data.error && 'Idle'}
            </span>
          </div>
          {data.error && (
            <p className="text-xs text-destructive">{data.error}</p>
          )}
        </div>
      </div>
    </div>
  );
};
