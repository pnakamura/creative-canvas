import React, { useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Network, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Layers,
  Download,
  Circle,
  Share2,
  Waypoints,
  Spline
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, MindmapSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const themeLabels: Record<string, string> = {
  modern: 'Modern',
  minimal: 'Minimal',
  corporate: 'Corporate',
  creative: 'Creative',
  dark: 'Dark',
};

const layoutIcons: Record<string, React.ElementType> = {
  radial: Circle,
  tree: GitBranch,
  organic: Share2,
};

const connectionLabels: Record<string, { label: string; icon: React.ElementType }> = {
  curved: { label: 'Curved', icon: Spline },
  straight: { label: 'Straight', icon: Waypoints },
  angular: { label: 'Angular', icon: Waypoints },
};

export const MindmapGeneratorNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, generatedOutput, mindmapSettings } = nodeData;
  const { toast } = useToast();

  const settings: MindmapSettings = mindmapSettings || {
    theme: 'modern',
    maxDepth: 4,
    maxBranches: 6,
    includeDescriptions: true,
    includeIcons: true,
    layout: 'radial',
    connectionStyle: 'curved',
  };

  const LayoutIcon = layoutIcons[settings.layout] || Circle;

  const handleGenerate = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    const analyzerNode = inputs.find((n) => n.data.type === 'textAnalyzer');
    const assistantNode = inputs.find((n) => n.data.type === 'assistant');
    const textNode = inputs.find((n) => n.data.type === 'text');
    
    const inputPrompt = analyzerNode?.data.prompt || assistantNode?.data.prompt || textNode?.data.content;
    const analysisResult = analyzerNode?.data.analysisResult;

    if (!inputPrompt) {
      updateNodeData(props.id, { error: 'Connect a Text Analyzer, Assistant, or Text node' });
      toast({
        title: "Missing Input",
        description: "Connect an input node with content",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-output', {
        body: { 
          type: 'mindmap',
          prompt: inputPrompt,
          analysisResult,
          settings,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      updateNodeData(props.id, {
        generatedOutput: data?.result,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: "Mindmap Generated",
        description: `Created with ${data?.result?.metadata?.sections || 0} branches`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate';
      updateNodeData(props.id, { error: errorMessage, isProcessing: false });
      toast({
        title: "Generation Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, getConnectedNodes, updateNodeData, toast, settings]);

  const { inputs } = getConnectedNodes(props.id);
  const hasInput = inputs.some((n) => n.data.prompt || n.data.content);

  return (
    <BaseNode
      {...props}
      icon={Network}
      iconColor="text-pink-400"
      fixedDescription="Generate mind maps"
      nodeCategory="output"
      inputs={[{ id: 'prompt-in', type: 'text', label: 'Prompt' }]}
      outputs={[{ id: 'output-out', type: 'text', label: 'Output' }]}
    >
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-pink-500/20 text-pink-400">
            {themeLabels[settings.theme]}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
            <LayoutIcon className="w-2.5 h-2.5" />
            {settings.layout}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
            <Layers className="w-2.5 h-2.5" />
            Depth: {settings.maxDepth}
          </Badge>
        </div>

        {/* Structure Info */}
        <div className="flex flex-wrap gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-1">
            <GitBranch className="w-2.5 h-2.5" /> Max {settings.maxBranches} branches
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
            {connectionLabels[settings.connectionStyle]?.label} connections
          </span>
        </div>

        {/* Input Status */}
        <div className="text-[10px] text-muted-foreground">
          {hasInput ? (
            <span className="text-green-400">✓ Input connected</span>
          ) : (
            <span className="text-yellow-400">⚠ Connect input</span>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleGenerate();
          }}
          disabled={isProcessing || !hasInput}
          className={cn(
            'nodrag w-full gap-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Network className="w-4 h-4" />
          )}
          {isProcessing ? 'Generating...' : 'Generate Mindmap'}
        </Button>

        {/* Output Display */}
        {generatedOutput && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Mindmap Ready
              </p>
              <Badge variant="outline" className="text-[9px]">
                {generatedOutput.metadata?.sections || 0} nodes
              </Badge>
            </div>

            <ScrollArea className="h-[80px]">
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                {generatedOutput.preview || generatedOutput.content?.slice(0, 200)}...
              </p>
            </ScrollArea>

            <Button
              variant="ghost"
              size="sm"
              className="nodrag w-full gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(generatedOutput.content || '');
                toast({ title: "Copied to clipboard" });
              }}
            >
              <Download className="w-3 h-3" />
              Copy Content
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>
    </BaseNode>
  );
};
