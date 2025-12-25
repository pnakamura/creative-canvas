import { ReactFlowProvider } from '@xyflow/react';
import { FlowCanvas } from '@/components/FlowCanvas';

const Index = () => {
  return (
    <ReactFlowProvider>
      <div className="min-h-screen bg-background overflow-hidden">
        <FlowCanvas />
      </div>
    </ReactFlowProvider>
  );
};

export default Index;
