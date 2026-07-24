import { useRef, useState } from 'react';
import { BookOpen, Download, Upload } from 'lucide-react';
import {
  exportRecipeJson,
  importRecipeJson,
  listBuiltInRecipes,
} from '@/lib/tools/converter/converter-recipes.js';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-recipes.js').ConverterRecipe>} props.recipes
 * @param {(recipe: import('@/lib/tools/converter/converter-recipes.js').ConverterRecipe) => void} props.onImport
 * @param {() => void} props.onExport
 * @param {(recipeId: string) => void} props.onApply
 * @param {boolean} [props.disabled]
 */
export default function ConverterRecipePanel({
  recipes,
  onImport,
  onExport,
  onApply,
  disabled = false,
}) {
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */(null));
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    () => recipes[0]?.id ?? listBuiltInRecipes()[0]?.id ?? '',
  );
  const [importError, setImportError] = useState('');

  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0];

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const recipe = importRecipeJson(text);
      if (!recipe) {
        setImportError('Could not import recipe — invalid JSON or schema.');
        return;
      }
      onImport(recipe);
      setSelectedRecipeId(recipe.id);
    } catch {
      setImportError('Could not read recipe file.');
    }
  };

  return (
    <section className="tools-converter-recipes" aria-labelledby="converter-recipes-heading">
      <div className="tools-converter-recipes-header">
        <BookOpen size={18} aria-hidden />
        <div>
          <h2 id="converter-recipes-heading">Recipes</h2>
          <p>Reusable conversion plans for selected files.</p>
        </div>
      </div>

      <div className="tools-converter-recipes-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="tools-converter-file-input"
          onChange={(event) => void handleImportFile(event)}
        />
        <button
          type="button"
          className="tools-converter-btn"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} aria-hidden />
          Import JSON
        </button>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={disabled || !selectedRecipe}
          onClick={() => {
            if (!selectedRecipe) return;
            const blob = new Blob([exportRecipeJson(selectedRecipe)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${selectedRecipe.id}.recipe.json`;
            anchor.click();
            URL.revokeObjectURL(url);
            onExport();
          }}
        >
          <Download size={16} aria-hidden />
          Export recipe
        </button>
      </div>

      {importError && (
        <p className="tools-converter-recipes-error" role="alert">{importError}</p>
      )}

      <ul className="tools-converter-recipes-list" role="list">
        {recipes.map((recipe) => {
          const isSelected = selectedRecipe?.id === recipe.id;
          return (
            <li key={recipe.id}>
              <button
                type="button"
                className={`tools-converter-recipe-card${isSelected ? ' tools-converter-recipe-card--selected' : ''}`}
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => setSelectedRecipeId(recipe.id)}
              >
                <span className="tools-converter-recipe-label">{recipe.label}</span>
                <span className="tools-converter-recipe-description">{recipe.description}</span>
                {recipe.appliesTo.category.length > 0 && (
                  <span className="tools-converter-recipe-meta">
                    {recipe.appliesTo.category.join(', ')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="tools-converter-btn tools-converter-btn--primary"
        disabled={disabled || !selectedRecipe}
        onClick={() => selectedRecipe && onApply(selectedRecipe.id)}
      >
        Apply recipe to selected
      </button>
    </section>
  );
}
