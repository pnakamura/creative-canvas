import { TextNode } from './TextNode';
import { AssistantNode } from './AssistantNode';
import { ImageGeneratorNode } from './ImageGeneratorNode';
import { VideoGeneratorNode } from './VideoGeneratorNode';
import { ReferenceNode } from './ReferenceNode';

export const nodeTypes = {
  textNode: TextNode,
  assistantNode: AssistantNode,
  imageGeneratorNode: ImageGeneratorNode,
  videoGeneratorNode: VideoGeneratorNode,
  referenceNode: ReferenceNode,
};

export { TextNode, AssistantNode, ImageGeneratorNode, VideoGeneratorNode, ReferenceNode };
