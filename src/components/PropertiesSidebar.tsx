import React from 'react';
import { X, Settings2, Type, Sparkles, Image, Video, FileText, Wand2, Brain, Lightbulb, Pencil, MessageSquare, FileSearch, BarChart3, Presentation, Network, FileCheck, GitCompare, BookOpen, FileSpreadsheet, Search, Layers, Scissors, Binary, Database, GitBranch, GripVertical, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
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
import { useFlowStore, AssistantMode, AssistantTone, AssistantSettings, AnalyzerOutputType, AnalyzerDepth, AnalyzerFormat, AnalyzerSettings, RetrieverSettings, ContextAssemblerSettings, ContextFormat, ChunkerSettings, ChunkStrategy, EmbeddingSettings, EmbeddingModel, VectorStoreSettings, RouterSettings, RouterCondition } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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

const analyzerOutputOptions: { value: AnalyzerOutputType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'report', label: 'Report', icon: FileText, description: 'Detailed written report' },
  { value: 'document', label: 'Document', icon: FileCheck, description: 'Official document format' },
  { value: 'infographic', label: 'Infographic', icon: BarChart3, description: 'Visual data layout' },
  { value: 'presentation', label: 'Presentation', icon: Presentation, description: 'Slide deck structure' },
  { value: 'mindmap', label: 'Mind Map', icon: Network, description: 'Concept hierarchy' },
  { value: 'analysis', label: 'Analysis', icon: FileSpreadsheet, description: 'Structured analysis' },
  { value: 'comparison', label: 'Comparison', icon: GitCompare, description: 'Side-by-side compare' },
  { value: 'summary', label: 'Summary', icon: BookOpen, description: 'Executive summary' },
];

const analyzerDepthOptions: { value: AnalyzerDepth; label: string; description: string }[] = [
  { value: 'brief', label: 'Brief', description: '200-400 words' },
  { value: 'standard', label: 'Standard', description: '400-800 words' },
  { value: 'detailed', label: 'Detailed', description: '800-1500 words' },
  { value: 'comprehensive', label: 'Comprehensive', description: '1500+ words' },
];

const analyzerFormatOptions: { value: AnalyzerFormat; label: string }[] = [
  { value: 'structured', label: 'Structured (Headers)' },
  { value: 'narrative', label: 'Narrative (Prose)' },
  { value: 'bullet-points', label: 'Bullet Points' },
  { value: 'academic', label: 'Academic' },
];

const contextFormatOptions: { value: ContextFormat; label: string; description: string }[] = [
  { value: 'structured', label: 'Structured', description: 'Numbered with headers' },
  { value: 'concatenated', label: 'Concatenated', description: 'Simple text blocks' },
  { value: 'markdown', label: 'Markdown', description: 'Formatted with markdown' },
];

const chunkStrategyOptions: { value: ChunkStrategy; label: string; description: string }[] = [
  { value: 'paragraph', label: 'Paragraph', description: 'Split by paragraphs' },
  { value: 'sentence', label: 'Sentence', description: 'Split by sentences' },
  { value: 'fixed', label: 'Fixed Size', description: 'Fixed token chunks' },
  { value: 'semantic', label: 'Semantic', description: 'AI-based semantic splitting' },
];

const embeddingModelOptions: { value: EmbeddingModel; label: string; dimensions: number }[] = [
  { value: 'text-embedding-3-small', label: 'Small (Fast)', dimensions: 1536 },
  { value: 'text-embedding-3-large', label: 'Large (Accurate)', dimensions: 3072 },
  { value: 'text-embedding-ada-002', label: 'Ada-002 (Legacy)', dimensions: 1536 },
];

const vectorStoreSortOptions: { value: 'date' | 'name' | 'chunks'; label: string }[] = [
  { value: 'date', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'chunks', label: 'Chunk Count' },
];

const routerDefaultBehaviorOptions: { value: 'continue' | 'stop' | 'error'; label: string; description: string }[] = [
  { value: 'continue', label: 'Continue', description: 'Continue to default output' },
  { value: 'stop', label: 'Stop', description: 'Stop execution if no match' },
  { value: 'error', label: 'Error', description: 'Throw error if no match' },
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
      case 'textAnalyzer': return FileSearch;
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
      case 'textAnalyzer': return 'text-cyan-400';
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

  const handleAnalyzerSettingsChange = (key: keyof AnalyzerSettings, value: any) => {
    const currentSettings: AnalyzerSettings = data.analyzerSettings || {
      outputType: 'report',
      depth: 'detailed',
      format: 'structured',
      includeMetrics: true,
      includeRecommendations: true,
      language: 'pt-BR',
      focusAreas: [],
    };
    
    updateNodeData(selectedNodeId!, {
      analyzerSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const handleRetrieverSettingsChange = (key: keyof RetrieverSettings, value: any) => {
    const currentSettings: RetrieverSettings = data.retrieverSettings || {
      topK: 5,
      threshold: 0.7,
    };
    
    updateNodeData(selectedNodeId!, {
      retrieverSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const handleContextAssemblerSettingsChange = (key: keyof ContextAssemblerSettings, value: any) => {
    const currentSettings: ContextAssemblerSettings = data.contextAssemblerSettings || {
      maxTokens: 4000,
      includeMetadata: true,
      separator: '\n\n---\n\n',
      format: 'structured',
    };
    
    updateNodeData(selectedNodeId!, {
      contextAssemblerSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const handleChunkerSettingsChange = (key: keyof ChunkerSettings, value: any) => {
    const currentSettings: ChunkerSettings = data.chunkerSettings || {
      strategy: 'paragraph',
      chunkSize: 500,
      overlap: 50,
      preserveSentences: true,
    };
    
    updateNodeData(selectedNodeId!, {
      chunkerSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const handleEmbeddingSettingsChange = (key: keyof EmbeddingSettings, value: any) => {
    const currentSettings: EmbeddingSettings = data.embeddingSettings || {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 100,
      storeInDb: true,
    };
    
    updateNodeData(selectedNodeId!, {
      embeddingSettings: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  const handleVectorStoreSettingsChange = (key: keyof VectorStoreSettings, value: any) => {
    const currentSettings: VectorStoreSettings = data.vectorStoreSettings || {
      showChunkPreview: true,
      maxPreviewChunks: 3,
      sortBy: 'date',
      sortOrder: 'desc',
      autoRefresh: false,
    };
    
    updateNodeData(selectedNodeId!, {
      vectorStoreSettings: {
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

  const analyzerSettings: AnalyzerSettings = data.analyzerSettings || {
    outputType: 'report',
    depth: 'detailed',
    format: 'structured',
    includeMetrics: true,
    includeRecommendations: true,
    language: 'pt-BR',
    focusAreas: [],
  };

  const retrieverSettings: RetrieverSettings = data.retrieverSettings || {
    topK: 5,
    threshold: 0.7,
  };

  const contextAssemblerSettings: ContextAssemblerSettings = data.contextAssemblerSettings || {
    maxTokens: 4000,
    includeMetadata: true,
    separator: '\n\n---\n\n',
    format: 'structured',
  };

  const chunkerSettings: ChunkerSettings = data.chunkerSettings || {
    strategy: 'paragraph',
    chunkSize: 500,
    overlap: 50,
    preserveSentences: true,
  };

  const embeddingSettings: EmbeddingSettings = data.embeddingSettings || {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    storeInDb: true,
  };

  const vectorStoreSettings: VectorStoreSettings = data.vectorStoreSettings || {
    showChunkPreview: true,
    maxPreviewChunks: 3,
    sortBy: 'date',
    sortOrder: 'desc',
    autoRefresh: false,
  };

  const routerSettings: RouterSettings = data.routerSettings || {
    conditions: [],
    evaluateAll: false,
    defaultBehavior: 'continue',
  };

  const handleRouterSettingsChange = (key: keyof RouterSettings, value: any) => {
    updateNodeData(selectedNodeId!, {
      routerSettings: {
        ...routerSettings,
        [key]: value,
      },
    });
  };

  const moveCondition = (index: number, direction: 'up' | 'down') => {
    const conditions = [...routerSettings.conditions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= conditions.length) return;
    
    [conditions[index], conditions[newIndex]] = [conditions[newIndex], conditions[index]];
    handleRouterSettingsChange('conditions', conditions);
  };

  const deleteCondition = (conditionId: string) => {
    const conditions = routerSettings.conditions.filter(c => c.id !== conditionId);
    handleRouterSettingsChange('conditions', conditions);
  };

  const toggleConditionEnabled = (conditionId: string) => {
    const conditions = routerSettings.conditions.map(c => 
      c.id === conditionId ? { ...c, enabled: !c.enabled } : c
    );
    handleRouterSettingsChange('conditions', conditions);
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

        {/* Text Analyzer Settings */}
        {data.type === 'textAnalyzer' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-cyan-400" />
                Text Analyzer Settings
              </h3>

              {/* Output Type */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Output Type
                </Label>
                <Select
                  value={analyzerSettings.outputType}
                  onValueChange={(value: AnalyzerOutputType) => handleAnalyzerSettingsChange('outputType', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {analyzerOutputOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Depth */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Analysis Depth
                </Label>
                <Select
                  value={analyzerSettings.depth}
                  onValueChange={(value: AnalyzerDepth) => handleAnalyzerSettingsChange('depth', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {analyzerDepthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.description})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Format Style
                </Label>
                <Select
                  value={analyzerSettings.format}
                  onValueChange={(value: AnalyzerFormat) => handleAnalyzerSettingsChange('format', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {analyzerFormatOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/50" />

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Include Metrics</Label>
                  <p className="text-xs text-muted-foreground">Add quantitative analysis</p>
                </div>
                <Switch
                  checked={analyzerSettings.includeMetrics}
                  onCheckedChange={(checked) => handleAnalyzerSettingsChange('includeMetrics', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Recommendations</Label>
                  <p className="text-xs text-muted-foreground">Include actionable insights</p>
                </div>
                <Switch
                  checked={analyzerSettings.includeRecommendations}
                  onCheckedChange={(checked) => handleAnalyzerSettingsChange('includeRecommendations', checked)}
                />
              </div>

              {/* Focus Areas */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Focus Areas (comma separated)
                </Label>
                <Textarea
                  placeholder="e.g., compliance, clarity, structure"
                  value={analyzerSettings.focusAreas?.join(', ') || ''}
                  onChange={(e) => handleAnalyzerSettingsChange('focusAreas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="bg-background/50 border-border/50 min-h-[60px] nodrag"
                />
              </div>
            </div>
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

        {/* Chunker Settings */}
        {data.type === 'chunker' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Scissors className="w-4 h-4 text-violet-400" />
                Chunker Settings
              </h3>

              {/* Strategy */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Chunking Strategy
                </Label>
                <Select
                  value={chunkerSettings.strategy}
                  onValueChange={(value: ChunkStrategy) => handleChunkerSettingsChange('strategy', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {chunkStrategyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chunk Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Chunk Size (tokens)
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {chunkerSettings.chunkSize}
                  </span>
                </div>
                <Slider
                  value={[chunkerSettings.chunkSize]}
                  onValueChange={([value]) => handleChunkerSettingsChange('chunkSize', value)}
                  min={100}
                  max={2000}
                  step={50}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Target size for each text chunk
                </p>
              </div>

              {/* Overlap */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Overlap (tokens)
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {chunkerSettings.overlap}
                  </span>
                </div>
                <Slider
                  value={[chunkerSettings.overlap]}
                  onValueChange={([value]) => handleChunkerSettingsChange('overlap', value)}
                  min={0}
                  max={500}
                  step={10}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Overlap between consecutive chunks
                </p>
              </div>

              <Separator className="bg-border/50" />

              {/* Preserve Sentences */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Preserve Sentences</Label>
                  <p className="text-xs text-muted-foreground">
                    Avoid splitting in the middle of sentences
                  </p>
                </div>
                <Switch
                  checked={chunkerSettings.preserveSentences}
                  onCheckedChange={(checked) => handleChunkerSettingsChange('preserveSentences', checked)}
                />
              </div>
            </div>
          </>
        )}

        {/* Embedding Settings */}
        {data.type === 'embedding' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Binary className="w-4 h-4 text-emerald-400" />
                Embedding Settings
              </h3>

              {/* Model */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Embedding Model
                </Label>
                <Select
                  value={embeddingSettings.model}
                  onValueChange={(value: EmbeddingModel) => {
                    const modelInfo = embeddingModelOptions.find(m => m.value === value);
                    handleEmbeddingSettingsChange('model', value);
                    if (modelInfo) {
                      handleEmbeddingSettingsChange('dimensions', modelInfo.dimensions);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {embeddingModelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.dimensions} dimensions</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Batch Size
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {embeddingSettings.batchSize}
                  </span>
                </div>
                <Slider
                  value={[embeddingSettings.batchSize]}
                  onValueChange={([value]) => handleEmbeddingSettingsChange('batchSize', value)}
                  min={10}
                  max={500}
                  step={10}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Process chunks in batches for efficiency
                </p>
              </div>

              <Separator className="bg-border/50" />

              {/* Store in DB */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Store in Database</Label>
                  <p className="text-xs text-muted-foreground">
                    Save embeddings to document_chunks table
                  </p>
                </div>
                <Switch
                  checked={embeddingSettings.storeInDb}
                  onCheckedChange={(checked) => handleEmbeddingSettingsChange('storeInDb', checked)}
                />
              </div>

              {/* Knowledge Base ID */}
              {embeddingSettings.storeInDb && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Knowledge Base ID (Optional)
                  </Label>
                  <Input
                    placeholder="Auto-generate if empty"
                    value={embeddingSettings.knowledgeBaseId || ''}
                    onChange={(e) => handleEmbeddingSettingsChange('knowledgeBaseId', e.target.value || undefined)}
                    className="bg-background/50 border-border/50 font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Retriever Settings */}
        {data.type === 'retriever' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-400" />
                Retriever Settings
              </h3>

              {/* Top K */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Top K (Documents)
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {retrieverSettings.topK}
                  </span>
                </div>
                <Slider
                  value={[retrieverSettings.topK]}
                  onValueChange={([value]) => handleRetrieverSettingsChange('topK', value)}
                  min={1}
                  max={20}
                  step={1}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Number of most similar documents to retrieve
                </p>
              </div>

              {/* Similarity Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Similarity Threshold
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {(retrieverSettings.threshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[retrieverSettings.threshold * 100]}
                  onValueChange={([value]) => handleRetrieverSettingsChange('threshold', value / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum similarity score for retrieved documents
                </p>
              </div>

              {/* Knowledge Base ID */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Knowledge Base ID (Optional)
                </Label>
                <Input
                  placeholder="Leave empty to search all"
                  value={retrieverSettings.knowledgeBaseId || ''}
                  onChange={(e) => handleRetrieverSettingsChange('knowledgeBaseId', e.target.value || undefined)}
                  className="bg-background/50 border-border/50 font-mono text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Context Assembler Settings */}
        {data.type === 'contextAssembler' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                Context Assembler Settings
              </h3>

              {/* Max Tokens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Max Tokens
                  </Label>
                  <span className="text-sm font-mono text-foreground">
                    {contextAssemblerSettings.maxTokens}
                  </span>
                </div>
                <Slider
                  value={[contextAssemblerSettings.maxTokens]}
                  onValueChange={([value]) => handleContextAssemblerSettingsChange('maxTokens', value)}
                  min={500}
                  max={16000}
                  step={500}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum token count for assembled context
                </p>
              </div>

              {/* Format */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Output Format
                </Label>
                <Select
                  value={contextAssemblerSettings.format}
                  onValueChange={(value: ContextFormat) => handleContextAssemblerSettingsChange('format', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {contextFormatOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Separator */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Document Separator
                </Label>
                <Input
                  value={contextAssemblerSettings.separator}
                  onChange={(e) => handleContextAssemblerSettingsChange('separator', e.target.value)}
                  className="bg-background/50 border-border/50 font-mono text-sm"
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Include Metadata Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Include Metadata</Label>
                  <p className="text-xs text-muted-foreground">
                    Add document source and similarity info
                  </p>
                </div>
                <Switch
                  checked={contextAssemblerSettings.includeMetadata}
                  onCheckedChange={(checked) => handleContextAssemblerSettingsChange('includeMetadata', checked)}
                />
              </div>
            </div>
          </>
        )}

        {/* Vector Store Settings */}
        {data.type === 'vectorStore' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                Vector Store Settings
              </h3>

              {/* Sort By */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Sort By
                </Label>
                <Select
                  value={vectorStoreSettings.sortBy}
                  onValueChange={(value: 'date' | 'name' | 'chunks') => handleVectorStoreSettingsChange('sortBy', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {vectorStoreSortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Sort Order
                </Label>
                <Select
                  value={vectorStoreSettings.sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => handleVectorStoreSettingsChange('sortOrder', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    <SelectItem value="desc">Descending (Newest First)</SelectItem>
                    <SelectItem value="asc">Ascending (Oldest First)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max Preview Chunks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Preview Chunks
                  </Label>
                  <span className="text-sm font-medium text-foreground">
                    {vectorStoreSettings.maxPreviewChunks}
                  </span>
                </div>
                <Slider
                  value={[vectorStoreSettings.maxPreviewChunks]}
                  onValueChange={([value]) => handleVectorStoreSettingsChange('maxPreviewChunks', value)}
                  min={1}
                  max={10}
                  step={1}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Number of chunk previews to show per document
                </p>
              </div>

              <Separator className="bg-border/50" />

              {/* Show Chunk Preview Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Show Chunk Preview</Label>
                  <p className="text-xs text-muted-foreground">
                    Display content previews for chunks
                  </p>
                </div>
                <Switch
                  checked={vectorStoreSettings.showChunkPreview}
                  onCheckedChange={(checked) => handleVectorStoreSettingsChange('showChunkPreview', checked)}
                />
              </div>

              {/* Auto Refresh Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Auto Refresh</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh knowledge base list
                  </p>
                </div>
                <Switch
                  checked={vectorStoreSettings.autoRefresh}
                  onCheckedChange={(checked) => handleVectorStoreSettingsChange('autoRefresh', checked)}
                />
              </div>

              {/* Selected KB Info */}
              {data.selectedKnowledgeBaseId && (
                <>
                  <Separator className="bg-border/50" />
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      Selected Knowledge Base
                    </Label>
                    <div className="p-2 rounded-md bg-teal-500/10 border border-teal-500/30">
                      <p className="text-xs text-teal-400 font-mono truncate">
                        {data.selectedKnowledgeBaseId as string}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {(data.knowledgeBaseCount as number) || 0} KBs available
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {(data.chunkCount as number) || 0} chunks loaded
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Router Settings */}
        {data.type === 'router' && (
          <>
            <Separator className="bg-border/50" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-400" />
                Router Settings
              </h3>

              {/* Evaluate All */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">Evaluate All</Label>
                  <p className="text-xs text-muted-foreground">
                    Check all conditions instead of stopping at first match
                  </p>
                </div>
                <Switch
                  checked={routerSettings.evaluateAll}
                  onCheckedChange={(checked) => handleRouterSettingsChange('evaluateAll', checked)}
                />
              </div>

              {/* Default Behavior */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  No Match Behavior
                </Label>
                <Select
                  value={routerSettings.defaultBehavior}
                  onValueChange={(value: 'continue' | 'stop' | 'error') => handleRouterSettingsChange('defaultBehavior', value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border/50">
                    {routerDefaultBehaviorOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/50" />

              {/* Conditions List with Reordering */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Conditions ({routerSettings.conditions.length})
                  </Label>
                </div>

                {routerSettings.conditions.length === 0 ? (
                  <div className="p-3 rounded-md bg-muted/30 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground">
                      No conditions configured. Add conditions in the node.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routerSettings.conditions.map((condition, index) => (
                      <div
                        key={condition.id}
                        className={cn(
                          "p-2 rounded-md border transition-colors",
                          condition.enabled
                            ? "bg-background/50 border-border/50"
                            : "bg-muted/20 border-border/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {condition.name || `Condition ${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {condition.field} {condition.operator} {condition.value}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveCondition(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveCondition(index, 'down')}
                              disabled={index === routerSettings.conditions.length - 1}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Switch
                              checked={condition.enabled}
                              onCheckedChange={() => toggleConditionEnabled(condition.id)}
                              className="scale-75"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteCondition(condition.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Evaluation Results */}
              {data.routerData?.lastEvaluatedAt && (
                <>
                  <Separator className="bg-border/50" />
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                      Last Evaluation
                    </Label>
                    <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-400 mb-1">
                        {new Date(data.routerData.lastEvaluatedAt).toLocaleString()}
                      </p>
                      {data.routerData.matchedBranch ? (
                        <p className="text-xs text-foreground">
                          Matched: <span className="font-medium text-green-400">{data.routerData.matchedBranch}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No conditions matched</p>
                      )}
                    </div>
                    {data.routerData.evaluationResults && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(data.routerData.evaluationResults).map(([condId, matched]) => {
                          const cond = routerSettings.conditions.find(c => c.id === condId);
                          return (
                            <Badge
                              key={condId}
                              variant="outline"
                              className={cn(
                                "text-xs",
                                matched ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"
                              )}
                            >
                              {cond?.name || condId}: {matched ? '✓' : '✗'}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
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
