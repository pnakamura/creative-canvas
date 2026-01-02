import React from 'react';
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
  const { addNode, selectedNodeId, deleteNode, isExecuting, nodes, loadRagPipelineTemplate, clearCanvas } = useFlowStore();

  const handleAddNode = (type: NodeType) => {
    const centerX = window.innerWidth / 2 - 150;
    const centerY = window.innerHeight / 2 - 100;
    addNode(type, { x: centerX + Math.random() * 100, y: centerY + Math.random() * 100 });
  };

  const handleLoadRagTemplate = () => {
    loadRagPipelineTemplate();
    toast.success('RAG Pipeline template loaded!', {
      description: 'Text → Chunker → Embedding → VectorStore → Retriever → ContextAssembler → Assistant',
    });
  };

  const handleClearCanvas = () => {
    clearCanvas();
    toast.info('Canvas cleared');
  };

  const sourceNodes = [
    { type: 'text' as NodeType, label: 'Text Input', icon: Type, color: 'text-green-400' },
    { type: 'reference' as NodeType, label: 'Reference', icon: File, color: 'text-green-400' },
    { type: 'vectorStore' as NodeType, label: 'Vector Store', icon: Database, color: 'text-teal-400' },
  ];

  const processorNodes = [
    { type: 'assistant' as NodeType, label: 'AI Assistant', icon: Sparkles, color: 'text-secondary' },
    { type: 'textAnalyzer' as NodeType, label: 'Text Analyzer', icon: FileSearch, color: 'text-cyan-400' },
    { type: 'chunker' as NodeType, label: 'Chunker', icon: Scissors, color: 'text-amber-400' },
    { type: 'embedding' as NodeType, label: 'Embedding', icon: Binary, color: 'text-violet-400' },
    { type: 'retriever' as NodeType, label: 'Retriever', icon: Search, color: 'text-emerald-400' },
    { type: 'contextAssembler' as NodeType, label: 'Context Assembler', icon: Layers, color: 'text-sky-400' },
  ];

  const generatorNodes = [
    { type: 'imageGenerator' as NodeType, label: 'Image Generator', icon: Image, color: 'text-handle-image' },
    { type: 'videoGenerator' as NodeType, label: 'Video Generator', icon: Video, color: 'text-accent' },
  ];

  const outputNodes = [
    { type: 'reportGenerator' as NodeType, label: 'Report Generator', icon: FileText, color: 'text-blue-400' },
    { type: 'documentGenerator' as NodeType, label: 'Document Generator', icon: FileCheck, color: 'text-green-400' },
    { type: 'infographicGenerator' as NodeType, label: 'Infographic Generator', icon: BarChart3, color: 'text-orange-400' },
    { type: 'presentationGenerator' as NodeType, label: 'Presentation Generator', icon: Presentation, color: 'text-purple-400' },
    { type: 'mindmapGenerator' as NodeType, label: 'Mindmap Generator', icon: Network, color: 'text-pink-400' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel rounded-xl p-2 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="toolbar-button">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Node</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel border-border/50 w-56 max-h-[70vh] overflow-y-auto" align="start">
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">Sources</DropdownMenuLabel>
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
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">Processors</DropdownMenuLabel>
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
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">Generators</DropdownMenuLabel>
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
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">Output</DropdownMenuLabel>
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
              <span className="hidden sm:inline">Templates</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel border-border/50 w-64" align="start">
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">Pipeline Templates</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleLoadRagTemplate}
                className="gap-2 cursor-pointer focus:bg-muted"
              >
                <Zap className="w-4 h-4 text-[hsl(var(--edge-rag))]" />
                <div className="flex flex-col">
                  <span className="font-medium">RAG Pipeline</span>
                  <span className="text-xs text-muted-foreground">
                    Complete retrieval-augmented generation flow
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
                  Clear Canvas
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-panel border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all nodes and connections from the canvas. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCanvas} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear
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
            {isExecuting ? 'Running...' : 'Execute Flow'}
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
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
