import { TextNode } from './TextNode';
import { AssistantNode } from './AssistantNode';
import { ImageGeneratorNode } from './ImageGeneratorNode';
import { VideoGeneratorNode } from './VideoGeneratorNode';
import { ReferenceNode } from './ReferenceNode';
import { TextAnalyzerNode } from './TextAnalyzerNode';
import { ReportGeneratorNode } from './ReportGeneratorNode';
import { DocumentGeneratorNode } from './DocumentGeneratorNode';
import { InfographicGeneratorNode } from './InfographicGeneratorNode';
import { PresentationGeneratorNode } from './PresentationGeneratorNode';
import { MindmapGeneratorNode } from './MindmapGeneratorNode';
import { ChunkerNode } from './ChunkerNode';
import { EmbeddingNode } from './EmbeddingNode';
import { RetrieverNode } from './RetrieverNode';
import { ContextAssemblerNode } from './ContextAssemblerNode';
import { VectorStoreNode } from './VectorStoreNode';
import { FileUploadNode } from './FileUploadNode';
import { ApiConnectorNode } from './ApiConnectorNode';
import { RouterNode } from './RouterNode';

export const nodeTypes = {
  textNode: TextNode,
  assistantNode: AssistantNode,
  imageGeneratorNode: ImageGeneratorNode,
  videoGeneratorNode: VideoGeneratorNode,
  referenceNode: ReferenceNode,
  textAnalyzerNode: TextAnalyzerNode,
  reportGeneratorNode: ReportGeneratorNode,
  documentGeneratorNode: DocumentGeneratorNode,
  infographicGeneratorNode: InfographicGeneratorNode,
  presentationGeneratorNode: PresentationGeneratorNode,
  mindmapGeneratorNode: MindmapGeneratorNode,
  chunkerNode: ChunkerNode,
  embeddingNode: EmbeddingNode,
  retrieverNode: RetrieverNode,
  contextAssemblerNode: ContextAssemblerNode,
  vectorStoreNode: VectorStoreNode,
  fileUploadNode: FileUploadNode,
  apiConnectorNode: ApiConnectorNode,
  routerNode: RouterNode,
};

export { 
  TextNode, 
  AssistantNode, 
  ImageGeneratorNode, 
  VideoGeneratorNode, 
  ReferenceNode, 
  TextAnalyzerNode,
  ReportGeneratorNode,
  DocumentGeneratorNode,
  InfographicGeneratorNode,
  PresentationGeneratorNode,
  MindmapGeneratorNode,
  ChunkerNode,
  EmbeddingNode,
  RetrieverNode,
  ContextAssemblerNode,
  VectorStoreNode,
  FileUploadNode,
  ApiConnectorNode,
  RouterNode,
};
