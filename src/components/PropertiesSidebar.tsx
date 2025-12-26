import React from 'react';
import { X, Settings2, Type, Sparkles, Image, Video, FileText, Wand2, Brain, Lightbulb, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFlowStore, AssistantMode, AssistantTone, AssistantSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const modeOptions: { value: AssistantMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'expand', label: 'Expand', icon: Wand2, description: 'Enhance and add details' },
  { value: 'analyze', label: 'Analyze', icon: Brain, description: 'Extract visual elements' },
  { value: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, description: 'Generate variations' },
  { value: 'refine', label: 'Refine', icon: Pencil, description: 'Improve clarity' },
  { value: 'freestyle', label: 'Freestyle', icon: MessageSquare, description: 'Open-ended response' },
];

const toneOptions: { value: AssistantTone; label: string }[] = [
  { value: 'creative', label: 'Creative' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'minimal', label: 'Minimal' },
];

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
      case 'reference': return FileText;
      default: return Settings2;
    }
  };

  const getNodeColor = () => {
    switch (data.type) {
      case 'text': return 'text-handle-text';
      case 'assistant': return 'text-secondary';
      case 'imageGenerator': return 'text-handle-image';
      case 'videoGenerator': return 'text-accent';
      case 'reference': return 'text-pink-400';
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

  const handleAssistantSettingsChange = (key: keyof AssistantSettings, value: any) => {
    const currentSettings: AssistantSettings = data.assistantSettings || {
      mode: 'expand',
      tone: 'creative',
      creativity: 70,
      outputLength: 'medium',
      includeNegativePrompt: false,
      preserveStyle: false,
    };
    
    updateNodeData(selectedNodeId!, {
      assistantSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const assistantSettings: AssistantSettings = data.assistantSettings || {
    mode: 'expand',
    tone: 'creative',
    creativity: 70,
    outputLength: 'medium',
    includeNegativePrompt: false,
    preserveStyle: false,
  };

  const creativityLabel = () => {
    if (assistantSettings.creativity < 30) return 'Conservative';
    if (assistantSettings.creativity < 60) return 'Balanced';
    if (assistantSettings.creativity < 80) return 'Creative';
    return 'Wild';
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 glass-panel border-l border-border/50 z-40 animate-slide-in-right overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
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

        {/* Assistant Settings */}
        {data.type === 'assistant' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                AI Assistant Settings
              </h3>

              {/* Mode Selection */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Processing Mode
                </Label>
                <Select
                  value={assistantSettings.mode}
                  onValueChange={(value: AssistantMode) => handleAssistantSettingsChange('mode', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {modeOptions.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          <mode.icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{mode.label}</div>
                            <div className="text-xs text-muted-foreground">{mode.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tone Selection */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Output Tone
                </Label>
                <Select
                  value={assistantSettings.tone}
                  onValueChange={(value: AssistantTone) => handleAssistantSettingsChange('tone', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {toneOptions.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Creativity Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Creativity
                  </Label>
                  <span className="text-sm font-medium text-foreground">
                    {creativityLabel()} ({assistantSettings.creativity}%)
                  </span>
                </div>
                <Slider
                  value={[assistantSettings.creativity]}
                  onValueChange={([value]) => handleAssistantSettingsChange('creativity', value)}
                  min={0}
                  max={100}
                  step={5}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values produce more experimental and unexpected results
                </p>
              </div>

              {/* Output Length */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Output Length
                </Label>
                <Select
                  value={assistantSettings.outputLength}
                  onValueChange={(value: 'short' | 'medium' | 'long') => handleAssistantSettingsChange('outputLength', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    <SelectItem value="short">Short (30-50 words)</SelectItem>
                    <SelectItem value="medium">Medium (80-150 words)</SelectItem>
                    <SelectItem value="long">Long (200-400 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/50" />

              {/* Advanced Options */}
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Advanced Options
              </h4>

              {/* Include Negative Prompt */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Negative Prompt</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate elements to avoid
                  </p>
                </div>
                <Switch
                  checked={assistantSettings.includeNegativePrompt}
                  onCheckedChange={(checked) => handleAssistantSettingsChange('includeNegativePrompt', checked)}
                />
              </div>

              {/* Preserve Style (for image context) */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Preserve Style</Label>
                  <p className="text-xs text-muted-foreground">
                    Maintain reference image style
                  </p>
                </div>
                <Switch
                  checked={assistantSettings.preserveStyle}
                  onCheckedChange={(checked) => handleAssistantSettingsChange('preserveStyle', checked)}
                />
              </div>
            </div>

            {/* Current Output */}
            {data.prompt && (
              <>
                <Separator className="bg-border/50" />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Current Output
                  </Label>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {data.prompt}
                    </p>
                    {data.negativePrompt && (
                      <>
                        <Separator className="my-2 bg-border/30" />
                        <p className="text-xs text-muted-foreground">Negative:</p>
                        <p className="text-xs text-destructive/70">{data.negativePrompt}</p>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Image Generator Settings */}
        {data.type === 'imageGenerator' && data.settings && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Image className="w-4 h-4 text-handle-image" />
                Image Settings
              </h3>

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
