import { TextNode } from './TextNode';
import { AssistantNode } from './AssistantNode';
import { ImageGeneratorNode } from './ImageGeneratorNode';
import { VideoGeneratorNode } from './VideoGeneratorNode';
import { ReferenceNode } from './ReferenceNode';
import { TextAnalyzerNode } from './TextAnalyzerNode';

export const nodeTypes = {
  textNode: TextNode,
  assistantNode: AssistantNode,
  imageGeneratorNode: ImageGeneratorNode,
  videoGeneratorNode: VideoGeneratorNode,
  referenceNode: ReferenceNode,
  textAnalyzerNode: TextAnalyzerNode,
};

export { TextNode, AssistantNode, ImageGeneratorNode, VideoGeneratorNode, ReferenceNode, TextAnalyzerNode };
