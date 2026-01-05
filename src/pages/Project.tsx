import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { useFlowStore } from '@/store/flowStore';
import { FlowCanvas } from '@/components/FlowCanvas';
import { Toolbar } from '@/components/Toolbar';
import { PropertiesSidebar } from '@/components/PropertiesSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Check, Pencil } from 'lucide-react';

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { 
    currentProject, 
    isLoading, 
    isSaving, 
    hasUnsavedChanges,
    loadProject, 
    saveProject, 
    updateProject,
    setHasUnsavedChanges 
  } = useProjectStore();
  const { nodes, edges, setNodes, setEdges, selectedNodeId } = useFlowStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initialLoadRef = useRef(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load project data
  useEffect(() => {
    if (id && user) {
      loadProject(id).then((data) => {
        if (data) {
          setNodes(data.nodes);
          setEdges(data.edges);
          initialLoadRef.current = false;
        } else {
          toast.error(t('project.notFound'));
          navigate('/dashboard');
        }
      });
    }
  }, [id, user, loadProject, setNodes, setEdges, navigate, t]);

  // Track changes after initial load
  useEffect(() => {
    if (!initialLoadRef.current && currentProject) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, currentProject, setHasUnsavedChanges]);

  // Auto-save with debounce
  useEffect(() => {
    if (hasUnsavedChanges && currentProject && !initialLoadRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    try {
      await saveProject(currentProject.id, nodes, edges);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      toast.error(t('project.saveError'));
    }
  }, [currentProject, nodes, edges, saveProject, t]);

  const handleNameSave = async () => {
    if (!currentProject || !editedName.trim()) return;
    
    await updateProject(currentProject.id, { name: editedName.trim() });
    setIsEditingName(false);
  };

  const startEditingName = () => {
    if (currentProject) {
      setEditedName(currentProject.name);
      setIsEditingName(true);
    }
  };

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              if (hasUnsavedChanges) {
                handleSave().then(() => navigate('/dashboard'));
              } else {
                navigate('/dashboard');
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleNameSave}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors group"
              onClick={startEditingName}
            >
              {currentProject?.name}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('project.saving')}
              </>
            ) : showSaved ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                {t('project.saved')}
              </>
            ) : hasUnsavedChanges ? (
              <span className="text-yellow-500">{t('project.unsavedChanges')}</span>
            ) : null}
          </div>
          
          <LanguageSelector />
          <ThemeToggle />
          
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('common.save')}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar />
        <div className="flex-1 relative">
          <FlowCanvas />
        </div>
        {selectedNodeId && <PropertiesSidebar />}
      </div>
    </div>
  );
};

export default Project;
