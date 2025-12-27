import React, { useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  FileText, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  TableOfContents,
  BarChart3,
  Quote,
  Download
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, ReportSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const styleLabels: Record<string, string> = {
  formal: 'Formal',
  technical: 'Technical',
  business: 'Business',
  academic: 'Academic',
  creative: 'Creative',
};

export const ReportGeneratorNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, generatedOutput, reportSettings } = nodeData;
  const { toast } = useToast();

  const settings: ReportSettings = reportSettings || {
    style: 'formal',
    includeExecutiveSummary: true,
    includeTableOfContents: true,
    includeCharts: true,
    includeReferences: true,
    maxSections: 10,
    language: 'pt-BR',
  };

  const handleGenerate = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    // Get prompt from Text Analyzer or Assistant
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
          type: 'report',
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
        title: "Report Generated",
        description: `Created ${data?.result?.metadata?.sections || 0} sections`,
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
      icon={FileText}
      iconColor="text-blue-400"
      fixedDescription="Generate detailed reports"
      nodeCategory="output"
      inputs={[{ id: 'prompt-in', type: 'text', label: 'Prompt' }]}
      outputs={[{ id: 'output-out', type: 'text', label: 'Output' }]}
    >
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400">
            {styleLabels[settings.style]}
          </Badge>
          {settings.includeExecutiveSummary && (
            <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
              <BookOpen className="w-2.5 h-2.5" />
              Summary
            </Badge>
          )}
          {settings.includeTableOfContents && (
            <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
              <TableOfContents className="w-2.5 h-2.5" />
              TOC
            </Badge>
          )}
          {settings.includeCharts && (
            <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
              <BarChart3 className="w-2.5 h-2.5" />
              Charts
            </Badge>
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
            'nodrag w-full gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isProcessing ? 'Generating...' : 'Generate Report'}
        </Button>

        {/* Output Display */}
        {generatedOutput && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Report Ready
              </p>
              <Badge variant="outline" className="text-[9px]">
                {generatedOutput.metadata?.wordCount || 0} words
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
