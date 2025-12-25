import { TextNode } from './TextNode';
import { AssistantNode } from './AssistantNode';
import { ImageGeneratorNode } from './ImageGeneratorNode';
import { VideoGeneratorNode } from './VideoGeneratorNode';

export const nodeTypes = {
  textNode: TextNode,
  assistantNode: AssistantNode,
  imageGeneratorNode: ImageGeneratorNode,
  videoGeneratorNode: VideoGeneratorNode,
};

export { TextNode, AssistantNode, ImageGeneratorNode, VideoGeneratorNode };
