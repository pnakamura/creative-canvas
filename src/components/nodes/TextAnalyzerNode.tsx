import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  FileSearch, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Network, 
  BarChart3, 
  FileCheck, 
  GitCompare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Scale
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, AnalyzerOutputType, AnalyzerSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const outputTypeConfig: Record<AnalyzerOutputType, { icon: React.ElementType; label: string; color: string; description: string }> = {
  report: { icon: FileText, label: 'Report', color: 'bg-blue-500/20 text-blue-400', description: 'Detailed written report' },
  document: { icon: FileCheck, label: 'Document', color: 'bg-green-500/20 text-green-400', description: 'Official document format' },
  infographic: { icon: BarChart3, label: 'Infographic', color: 'bg-orange-500/20 text-orange-400', description: 'Visual data representation' },
  presentation: { icon: Presentation, label: 'Presentation', color: 'bg-purple-500/20 text-purple-400', description: 'Slide deck structure' },
  mindmap: { icon: Network, label: 'Mind Map', color: 'bg-pink-500/20 text-pink-400', description: 'Hierarchical concept map' },
  analysis: { icon: FileSpreadsheet, label: 'Analysis', color: 'bg-cyan-500/20 text-cyan-400', description: 'Structured analysis' },
  comparison: { icon: GitCompare, label: 'Comparison', color: 'bg-yellow-500/20 text-yellow-400', description: 'Side-by-side comparison' },
  summary: { icon: BookOpen, label: 'Summary', color: 'bg-indigo-500/20 text-indigo-400', description: 'Executive summary' },
};

export const TextAnalyzerNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, prompt, error, analyzerSettings, analysisResult } = nodeData;
  const { toast } = useToast();

  const settings: AnalyzerSettings = analyzerSettings || {
    outputType: 'report',
    depth: 'detailed',
    format: 'structured',
    includeMetrics: true,
    includeRecommendations: true,
    language: 'pt-BR',
    focusAreas: [],
  };

  const currentOutputType = settings.outputType || 'report';
  const OutputIcon = outputTypeConfig[currentOutputType].icon;

  const handleAnalyze = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    // Get primary text (main content to analyze)
    const primaryTextNode = inputs.find((n) => n.data.type === 'text');
    // Get reference text (for comparison)
    const referenceNode = inputs.find((n) => n.data.type === 'reference');
    // Secondary text input for comparison
    const secondaryTextNodes = inputs.filter((n) => n.data.type === 'text' && n.id !== primaryTextNode?.id);
    
    if (!primaryTextNode?.data.content && !referenceNode?.data.extractedText) {
      updateNodeData(props.id, { error: 'Connect at least one text input' });
      toast({
        title: "Missing Input",
        description: "Connect a Text node or Reference node with content",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const primaryText = primaryTextNode?.data.content || '';
      let referenceText = '';
      let referenceSource = '';

      // Get reference content
      if (referenceNode) {
        referenceText = referenceNode.data.extractedText || referenceNode.data.content || '';
        referenceSource = referenceNode.data.fileName || 'Reference Document';
      } else if (secondaryTextNodes.length > 0) {
        referenceText = secondaryTextNodes.map(n => n.data.content).join('\n\n---\n\n');
        referenceSource = 'Secondary Text Input';
      }

      const { data, error: fnError } = await supabase.functions.invoke('text-analyzer', {
        body: { 
          primaryText,
          referenceText,
          referenceSource,
          outputType: settings.outputType,
          depth: settings.depth,
          format: settings.format,
          includeMetrics: settings.includeMetrics,
          includeRecommendations: settings.includeRecommendations,
          language: settings.language,
          focusAreas: settings.focusAreas,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.result;
      
      if (!result) {
        throw new Error('No response from analyzer');
      }
      
      updateNodeData(props.id, {
        prompt: result.prompt,
        analysisResult: result.analysis,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: `${outputTypeConfig[currentOutputType].label} Generated`,
        description: `Analysis complete with ${result.analysis?.sections?.length || 0} sections`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, getConnectedNodes, updateNodeData, toast, settings, currentOutputType]);

  const { inputs } = getConnectedNodes(props.id);
  const primaryTextNode = inputs.find((n) => n.data.type === 'text');
  const referenceNode = inputs.find((n) => n.data.type === 'reference');
  const hasMultipleTexts = inputs.filter((n) => n.data.type === 'text').length > 1;

  const depthLabel = useMemo(() => {
    switch (settings.depth) {
      case 'brief': return 'Quick';
      case 'standard': return 'Standard';
      case 'detailed': return 'Detailed';
      case 'comprehensive': return 'Deep';
      default: return 'Standard';
    }
  }, [settings.depth]);

  const analysisProgress = useMemo(() => {
    if (!analysisResult) return 0;
    const sections = analysisResult.sections?.length || 0;
    const hasMetrics = analysisResult.metrics ? 20 : 0;
    const hasRecommendations = analysisResult.recommendations?.length ? 20 : 0;
    return Math.min(100, sections * 15 + hasMetrics + hasRecommendations);
  }, [analysisResult]);

  return (
    <BaseNode
      {...props}
      icon={FileSearch}
      iconColor="text-cyan-400"
      fixedDescription="Text Analysis & Comparison"
      nodeCategory="processor"
      inputs={[
        { id: 'primary-in', type: 'text', label: 'Primary Text' },
        { id: 'reference-in', type: 'context', label: 'Reference' },
      ]}
      outputs={[{ id: 'prompt-out', type: 'text', label: 'Prompt' }]}
    >
      <div className="space-y-3">
        {/* Output Type & Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={cn('gap-1 text-[10px]', outputTypeConfig[currentOutputType].color)}>
            <OutputIcon className="w-3 h-3" />
            {outputTypeConfig[currentOutputType].label}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            {depthLabel}
          </Badge>
          {settings.includeMetrics && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 gap-1">
              <BarChart3 className="w-2.5 h-2.5" />
              Metrics
            </Badge>
          )}
        </div>

        {/* Connected Inputs Display */}
        <div className="space-y-1.5">
          {primaryTextNode && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                <FileText className="w-3 h-3" /> Primary
              </span>
              <span className="text-muted-foreground truncate max-w-[120px]">
                {primaryTextNode.data.content ? `${primaryTextNode.data.content.slice(0, 30)}...` : 'Empty'}
              </span>
            </div>
          )}
          
          {referenceNode && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                <Scale className="w-3 h-3" /> Reference
              </span>
              <span className="text-muted-foreground truncate max-w-[120px]">
                {referenceNode.data.fileName || 'Document'}
              </span>
            </div>
          )}

          {hasMultipleTexts && (
            <div className="flex items-center gap-1 text-[10px] text-yellow-400">
              <GitCompare className="w-3 h-3" />
              Comparison Mode Active
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleAnalyze();
          }}
          disabled={isProcessing}
          className={cn(
            'nodrag w-full gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSearch className="w-4 h-4" />
          )}
          {isProcessing ? 'Analyzing...' : `Generate ${outputTypeConfig[currentOutputType].label}`}
        </Button>

        {/* Analysis Progress */}
        {isProcessing && (
          <div className="space-y-1">
            <Progress value={33} className="h-1" />
            <p className="text-[10px] text-muted-foreground text-center">Processing content...</p>
          </div>
        )}

        {/* Output Display */}
        {analysisResult && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Analysis Complete
              </p>
              <Badge variant="outline" className="text-[9px]">
                {analysisResult.sections?.length || 0} sections
              </Badge>
            </div>

            {/* Key Metrics Preview */}
            {analysisResult.metrics && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(analysisResult.metrics).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="text-center p-1.5 rounded bg-muted/30">
                    <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xs font-medium text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Prompt Preview */}
            {prompt && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">Output Prompt:</p>
                <p className="text-xs text-foreground/80 line-clamp-3">{prompt}</p>
              </div>
            )}
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
