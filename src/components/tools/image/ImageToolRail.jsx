import {
  Crop,
  Eraser,
  SlidersHorizontal,
  Sparkles,
  Layers,
  PenLine,
  Shapes,
} from 'lucide-react';
import CropPanel from '@/components/tools/image/tools/CropPanel';
import AdjustPanel from '@/components/tools/image/tools/AdjustPanel';
import FiltersPanel from '@/components/tools/image/tools/FiltersPanel';
import EraserPanel from '@/components/tools/image/tools/EraserPanel';
import LayersPanel from '@/components/tools/image/tools/LayersPanel';
import AnnotatePanel from '@/components/tools/image/tools/AnnotatePanel';
import ElementsPanel from '@/components/tools/image/tools/ElementsPanel';

const HOME_TOOLS = [
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'filters', label: 'Filters', icon: Sparkles },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'annotate', label: 'Annotate', icon: PenLine },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'layers', label: 'Layers', icon: Layers },
];

export default function ImageToolRail({ workspace }) {
  const ws = workspace;
  const { activeTool, openTool, closeTool, resetToolDraft, applyToolDone, selected } = ws;

  if (activeTool === 'crop') {
    return (
      <CropPanel
        layer={selected}
        cropDraft={ws.cropDraft}
        setCropDraft={ws.setCropDraft}
        cropRotation={ws.cropRotation}
        setCropRotation={ws.setCropRotation}
        onBack={closeTool}
        onReset={resetToolDraft}
        onDone={applyToolDone}
      />
    );
  }
  if (activeTool === 'adjust') {
    return (
      <AdjustPanel
        adjustDraft={ws.adjustDraft}
        setAdjustDraft={ws.setAdjustDraft}
        onBack={closeTool}
        onReset={resetToolDraft}
        onDone={applyToolDone}
      />
    );
  }
  if (activeTool === 'filters') {
    return (
      <FiltersPanel
        layer={selected}
        filterDraft={ws.filterDraft}
        setFilterDraft={ws.setFilterDraft}
        onBack={closeTool}
        onReset={resetToolDraft}
        onDone={applyToolDone}
      />
    );
  }
  if (activeTool === 'eraser') {
    return (
      <EraserPanel
        eraserMode={ws.eraserMode}
        setEraserMode={ws.setEraserMode}
        eraserSize={ws.eraserSize}
        setEraserSize={ws.setEraserSize}
        eraserShowOriginal={ws.eraserShowOriginal}
        setEraserShowOriginal={ws.setEraserShowOriginal}
        rembgStatus={ws.rembgStatus}
        rembgError={ws.rembgError}
        onRemoveBackground={ws.runRemoveBackground}
        onBack={closeTool}
        onReset={resetToolDraft}
        onDone={applyToolDone}
      />
    );
  }
  if (activeTool === 'annotate') {
    return (
      <AnnotatePanel
        annotateMode={ws.annotateMode}
        setAnnotateMode={ws.setAnnotateMode}
        onBack={closeTool}
        onDone={applyToolDone}
      />
    );
  }
  if (activeTool === 'elements') {
    return (
      <ElementsPanel
        doc={ws.doc}
        onPlaceGraphic={ws.placeGraphic}
        onPlaceShape={ws.placeShape}
        onPlaceSessionImage={ws.placeSessionImage}
        onUploadImages={ws.addFiles}
        accept={ws.acceptAttribute}
        onBack={closeTool}
      />
    );
  }
  if (activeTool === 'layers') {
    return (
      <LayersPanel
        doc={ws.doc}
        selectedId={selected?.id}
        onSelect={ws.selectLayer}
        onReorder={ws.moveLayer}
        onVisible={ws.setLayerVisible}
        onLocked={ws.setLayerLocked}
        onDuplicate={ws.duplicateSelected}
        onDelete={ws.deleteSelected}
        onFlip={ws.flipSelected}
        onAlign={ws.alignSelected}
        onOpacity={ws.setLayerOpacity}
        onEdit={ws.openNestedEdit}
        onBack={closeTool}
      />
    );
  }

  return (
    <div className="tools-image-tool-home">
      <h3 className="tools-image-tool-home-title">Tools</h3>
      <div className="tools-image-tool-grid">
        {HOME_TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="tools-image-tool-tile"
            onClick={() => openTool(id)}
          >
            <span className="tools-image-tool-tile-icon" aria-hidden>
              <Icon size={18} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
