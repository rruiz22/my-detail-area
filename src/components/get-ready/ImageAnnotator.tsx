import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Circle,
  MessageSquare,
  Pen,
  Save,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  color: 'red' | 'yellow' | 'green';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  // For arrows
  x2?: number;
  y2?: number;
}

interface ImageAnnotatorProps {
  imageUrl: string;
  annotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onCancel: () => void;
  className?: string;
}

export function ImageAnnotator({
  imageUrl,
  annotations: initialAnnotations,
  onSave,
  onCancel,
  className,
}: ImageAnnotatorProps) {
  const { t } = useTranslation();
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [activeTool, setActiveTool] = useState<Annotation['type'] | null>(null);
  const [activeColor, setActiveColor] = useState<Annotation['color']>('red');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [textInput, setTextInput] = useState('');
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingTextCoords, setPendingTextCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image dimensions
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const updateDimensions = () => {
      setImageDimensions({
        width: img.offsetWidth,
        height: img.offsetHeight,
      });
    };

    if (img.complete) {
      updateDimensions();
    }

    img.addEventListener('load', updateDimensions);
    window.addEventListener('resize', updateDimensions);

    return () => {
      img.removeEventListener('load', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [imageUrl]);

  const getRelativeCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100, // Percentage
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeTool) return;

    const coords = getRelativeCoordinates(e);
    const newId = `annotation-${Date.now()}`;

    if (activeTool === 'text') {
      // Open text input dialog instead of prompt
      setPendingTextCoords(coords);
      setTextDialogOpen(true);
      return;
    }

    setIsDrawing(true);
    setCurrentAnnotation({
      id: newId,
      type: activeTool,
      color: activeColor,
      x: coords.x,
      y: coords.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !currentAnnotation) return;

    const coords = getRelativeCoordinates(e);

    if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation({
        ...currentAnnotation,
        x2: coords.x,
        y2: coords.y,
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: Math.abs(coords.x - currentAnnotation.x),
        height: Math.abs(coords.y - currentAnnotation.y),
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;

    setAnnotations([...annotations, currentAnnotation]);
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  const handleSave = () => {
    onSave(annotations);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !pendingTextCoords) return;

    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}`,
      type: 'text',
      color: activeColor,
      x: pendingTextCoords.x,
      y: pendingTextCoords.y,
      text: textInput.trim(),
    };

    setAnnotations([...annotations, newAnnotation]);
    setTextInput('');
    setTextDialogOpen(false);
    setPendingTextCoords(null);
  };

  const colorMap = {
    red: '#EF4444',
    yellow: '#F59E0B',
    green: '#10B981',
  };

  const renderAnnotation = (annotation: Annotation) => {
    const color = colorMap[annotation.color];

    switch (annotation.type) {
      case 'arrow':
        if (!annotation.x2 || !annotation.y2) return null;
        return (
          <g key={annotation.id}>
            <line
              x1={`${annotation.x}%`}
              y1={`${annotation.y}%`}
              x2={`${annotation.x2}%`}
              y2={`${annotation.y2}%`}
              stroke={color}
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );

      case 'circle':
        const radius = Math.sqrt(
          Math.pow(annotation.width || 0, 2) + Math.pow(annotation.height || 0, 2)
        ) / 2;
        return (
          <circle
            key={annotation.id}
            cx={`${annotation.x}%`}
            cy={`${annotation.y}%`}
            r={`${radius}%`}
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
        );

      case 'rectangle':
        return (
          <rect
            key={annotation.id}
            x={`${annotation.x}%`}
            y={`${annotation.y}%`}
            width={`${annotation.width || 0}%`}
            height={`${annotation.height || 0}%`}
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
        );

      case 'text':
        return (
          <text
            key={annotation.id}
            x={`${annotation.x}%`}
            y={`${annotation.y}%`}
            fill={color}
            fontSize="16"
            fontWeight="bold"
            style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
          >
            {annotation.text}
          </text>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('relative flex flex-col h-full w-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900 border-b z-50 relative">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              type="button"
              size="sm"
              variant={activeTool === 'arrow' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTool('arrow');
              }}
              title="Arrow tool"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTool === 'circle' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTool('circle');
              }}
              title="Circle tool"
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTool('rectangle');
              }}
              title="Rectangle tool"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTool === 'text' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTool('text');
              }}
              title="Text tool"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={activeColor === 'red' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveColor('red');
              }}
              className="w-8 h-8 p-0"
              style={{ backgroundColor: activeColor === 'red' ? '#EF4444' : undefined }}
              title="Red color"
            >
              <div className="w-4 h-4 rounded-full bg-red-500" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeColor === 'yellow' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveColor('yellow');
              }}
              className="w-8 h-8 p-0"
              style={{ backgroundColor: activeColor === 'yellow' ? '#F59E0B' : undefined }}
              title="Yellow color"
            >
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeColor === 'green' ? 'default' : 'ghost'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveColor('green');
              }}
              className="w-8 h-8 p-0"
              style={{ backgroundColor: activeColor === 'green' ? '#10B981' : undefined }}
              title="Green color"
            >
              <div className="w-4 h-4 rounded-full bg-green-500" />
            </Button>
          </div>

          {/* Clear all */}
          {annotations.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAnnotations([]);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('get_ready.media.annotations.clear_all')}
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
          >
            <X className="h-4 w-4 mr-2" />
            {t('common.action_buttons.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            {t('common.action_buttons.save')}
          </Button>
        </div>
      </div>

      {/* Annotation Canvas */}
      <div ref={containerRef} className="relative flex-1 flex items-center justify-center bg-black overflow-auto z-10">
        <div className="relative">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Annotate"
            className="max-w-full max-h-full object-contain select-none pointer-events-none"
            draggable={false}
          />

          {/* SVG Overlay */}
          <svg
            className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={colorMap[activeColor]} />
              </marker>
            </defs>

            {/* Render existing annotations */}
            {annotations.map(renderAnnotation)}

            {/* Render current annotation being drawn */}
            {currentAnnotation && renderAnnotation(currentAnnotation)}
          </svg>
        </div>
      </div>

      {/* Hint */}
      <div className="p-2 bg-gray-100 dark:bg-gray-900 text-center text-xs text-muted-foreground z-50 relative">
        {activeTool
          ? t('get_ready.media.annotations.draw_hint')
          : t('get_ready.media.annotations.select_tool_hint')}
      </div>

      {/* Text Input Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('get_ready.media.annotations.add_text')}</DialogTitle>
            <DialogDescription>
              {t('get_ready.media.annotations.add_text_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="annotation-text">{t('get_ready.media.annotations.text')}</Label>
              <Input
                id="annotation-text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t('get_ready.media.annotations.text_placeholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTextDialogOpen(false);
                setTextInput('');
                setPendingTextCoords(null);
              }}
            >
              {t('common.action_buttons.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
            >
              {t('get_ready.media.annotations.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
