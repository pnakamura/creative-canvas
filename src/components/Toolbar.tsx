import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Sparkles,
  Image,
  Video,
  Play,
  Loader2,
  Plus,
  Trash2,
  File,
  FileSearch,
  FileText,
  FileCheck,
  BarChart3,
  Presentation,
  Network,
  Scissors,
  Binary,
  Search,
  Layers,
  Database,
  LayoutTemplate,
  Zap,
  Eraser,
  Globe,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFlowStore, NodeType } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ToolbarProps {
  onExecuteFlow?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExecuteFlow }) => {
  const { t } = useTranslation();
  const { addNode, selectedNodeId, deleteNode, isExecuting, nodes, loadRagPipelineTemplate, clearCanvas } = useFlowStore();

  const handleAddNode = (type: NodeType) => {
    const centerX = window.innerWidth / 2 - 150;
    const centerY = window.innerHeight / 2 - 100;
    addNode(type, { x: centerX + Math.random() * 100, y: centerY + Math.random() * 100 });
  };

  const handleLoadRagTemplate = () => {
    loadRagPipelineTemplate();
    toast.success(t('toolbar.ragPipelineLoaded'), {
      description: 'Text → Chunker → Embedding → VectorStore → Retriever → ContextAssembler → Assistant',
    });
  };

  const handleClearCanvas = () => {
    clearCanvas();
    toast.info(t('toolbar.canvasCleared'));
  };

  const sourceNodes = [
    { type: 'text' as NodeType, label: t('nodes.textInput'), icon: Type, color: 'text-green-400' },
    { type: 'fileUpload' as NodeType, label: t('nodes.fileUpload'), icon: File, color: 'text-emerald-400' },
    { type: 'reference' as NodeType, label: t('nodes.reference'), icon: File, color: 'text-green-400' },
    { type: 'vectorStore' as NodeType, label: t('nodes.vectorStore'), icon: Database, color: 'text-teal-400' },
  ];

  const processorNodes = [
    { type: 'assistant' as NodeType, label: t('nodes.aiAssistant'), icon: Sparkles, color: 'text-secondary' },
    { type: 'textAnalyzer' as NodeType, label: t('nodes.textAnalyzer'), icon: FileSearch, color: 'text-cyan-400' },
    { type: 'apiConnector' as NodeType, label: t('nodes.apiConnector'), icon: Globe, color: 'text-blue-400' },
    { type: 'router' as NodeType, label: t('nodes.conditionalRouter'), icon: GitBranch, color: 'text-amber-400' },
    { type: 'chunker' as NodeType, label: t('nodes.chunker'), icon: Scissors, color: 'text-amber-400' },
    { type: 'embedding' as NodeType, label: t('nodes.embedding'), icon: Binary, color: 'text-violet-400' },
    { type: 'retriever' as NodeType, label: t('nodes.retriever'), icon: Search, color: 'text-emerald-400' },
    { type: 'contextAssembler' as NodeType, label: t('nodes.contextAssembler'), icon: Layers, color: 'text-sky-400' },
  ];

  const generatorNodes = [
    { type: 'imageGenerator' as NodeType, label: t('nodes.imageGenerator'), icon: Image, color: 'text-handle-image' },
    { type: 'videoGenerator' as NodeType, label: t('nodes.videoGenerator'), icon: Video, color: 'text-accent' },
  ];

  const outputNodes = [
    { type: 'reportGenerator' as NodeType, label: t('nodes.reportGenerator'), icon: FileText, color: 'text-blue-400' },
    { type: 'documentGenerator' as NodeType, label: t('nodes.documentGenerator'), icon: FileCheck, color: 'text-green-400' },
    { type: 'infographicGenerator' as NodeType, label: t('nodes.infographicGenerator'), icon: BarChart3, color: 'text-orange-400' },
    { type: 'presentationGenerator' as NodeType, label: t('nodes.presentationGenerator'), icon: Presentation, color: 'text-purple-400' },
    { type: 'mindmapGenerator' as NodeType, label: t('nodes.mindmapGenerator'), icon: Network, color: 'text-pink-400' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel rounded-xl p-2 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="toolbar-button">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('toolbar.addNode')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel border-border/50 w-56 max-h-[70vh] overflow-y-auto" align="start">
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">{t('toolbar.sources')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {sourceNodes.map((option) => (
                <DropdownMenuItem
                  key={option.type}
                  onClick={() => handleAddNode(option.type)}
                  className="gap-2 cursor-pointer focus:bg-muted"
                >
                  <option.icon className={cn('w-4 h-4', option.color)} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">{t('toolbar.processors')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {processorNodes.map((option) => (
                <DropdownMenuItem
                  key={option.type}
                  onClick={() => handleAddNode(option.type)}
                  className="gap-2 cursor-pointer focus:bg-muted"
                >
                  <option.icon className={cn('w-4 h-4', option.color)} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">{t('toolbar.generators')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {generatorNodes.map((option) => (
                <DropdownMenuItem
                  key={option.type}
                  onClick={() => handleAddNode(option.type)}
                  className="gap-2 cursor-pointer focus:bg-muted"
                >
                  <option.icon className={cn('w-4 h-4', option.color)} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">{t('toolbar.output')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {outputNodes.map((option) => (
                <DropdownMenuItem
                  key={option.type}
                  onClick={() => handleAddNode(option.type)}
                  className="gap-2 cursor-pointer focus:bg-muted"
                >
                  <option.icon className={cn('w-4 h-4', option.color)} />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border/50" />

        {/* Templates dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="toolbar-button">
              <LayoutTemplate className="w-4 h-4" />
              <span className="hidden sm:inline">{t('toolbar.templates')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel border-border/50 w-64" align="start">
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">{t('toolbar.pipelineTemplates')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleLoadRagTemplate}
                className="gap-2 cursor-pointer focus:bg-muted"
              >
                <Zap className="w-4 h-4 text-[hsl(var(--edge-rag))]" />
                <div className="flex flex-col">
                  <span className="font-medium">{t('toolbar.ragPipeline')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('toolbar.ragDescription')}
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/50" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2 cursor-pointer focus:bg-muted text-muted-foreground"
                >
                  <Eraser className="w-4 h-4" />
                  {t('toolbar.clearCanvas')}
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-panel border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('toolbar.clearCanvasConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('toolbar.clearCanvasWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCanvas} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('common.clear')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border/50" />

        <Button
          variant="ghost"
          className="toolbar-button primary"
          onClick={onExecuteFlow}
          disabled={isExecuting || nodes.length === 0 || !onExecuteFlow}
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isExecuting ? t('toolbar.running') : t('toolbar.executeFlow')}
          </span>
        </Button>

        {selectedNodeId && (
          <>
            <div className="w-px h-6 bg-border/50" />
            <Button
              variant="ghost"
              className="toolbar-button text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => deleteNode(selectedNodeId)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('toolbar.delete')}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
