import React, { useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Presentation, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  BarChart3,
  MessageSquareQuote,
  Download,
  Layers,
  Play,
  Monitor,
  Smartphone,
  Square
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, PresentationSettings } from '@/store/flowStore';
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

const aspectRatioIcons: Record<string, React.ElementType> = {
  '16:9': Monitor,
  '4:3': Monitor,
  '1:1': Square,
};

export const PresentationGeneratorNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, generatedOutput, presentationSettings } = nodeData;
  const { toast } = useToast();

  const settings: PresentationSettings = presentationSettings || {
    theme: 'modern',
    slidesCount: 10,
    includeImages: true,
    includeCharts: true,
    includeSpeakerNotes: true,
    transitionStyle: 'fade',
    aspectRatio: '16:9',
  };

  const AspectIcon = aspectRatioIcons[settings.aspectRatio] || Monitor;

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
          type: 'presentation',
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
        title: "Presentation Generated",
        description: `Created ${data?.result?.metadata?.sections || settings.slidesCount} slides`,
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
      icon={Presentation}
      iconColor="text-purple-400"
      fixedDescription="Generate presentation slides"
      nodeCategory="output"
      inputs={[{ id: 'prompt-in', type: 'text', label: 'Prompt' }]}
      outputs={[{ id: 'output-out', type: 'text', label: 'Output' }]}
    >
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400">
            {themeLabels[settings.theme]}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
            <Layers className="w-2.5 h-2.5" />
            {settings.slidesCount} slides
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
            <AspectIcon className="w-2.5 h-2.5" />
            {settings.aspectRatio}
          </Badge>
        </div>

        {/* Feature indicators */}
        <div className="flex flex-wrap gap-1">
          {settings.includeImages && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5" /> Images
            </span>
          )}
          {settings.includeCharts && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-2.5 h-2.5" /> Charts
            </span>
          )}
          {settings.includeSpeakerNotes && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground flex items-center gap-1">
              <MessageSquareQuote className="w-2.5 h-2.5" /> Notes
            </span>
          )}
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
            'nodrag w-full gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Presentation className="w-4 h-4" />
          )}
          {isProcessing ? 'Generating...' : 'Generate Presentation'}
        </Button>

        {/* Output Display */}
        {generatedOutput && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Presentation Ready
              </p>
              <Badge variant="outline" className="text-[9px]">
                {generatedOutput.metadata?.sections || settings.slidesCount} slides
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
