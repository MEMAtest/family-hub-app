'use client'

import React, { useState } from 'react';
import { MealRecipe, ImportedRecipeData, RecipeImportData } from '@/types/meals.types';
import {
  X,
  Upload,
  Link,
  Camera,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  Image
} from 'lucide-react';

interface RecipeImporterProps {
  onImport: (recipes: MealRecipe[]) => void;
  onClose: () => void;
}

const RecipeImporter: React.FC<RecipeImporterProps> = ({ onImport, onClose }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'photo' | 'text' | 'file'>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [importData, setImportData] = useState<RecipeImportData>({});
  const [importedRecipes, setImportedRecipes] = useState<ImportedRecipeData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const tabs = [
    {
      id: 'url',
      label: 'From URL',
      icon: <Globe className="w-4 h-4" />,
      description: 'Import from recipe websites'
    },
    {
      id: 'photo',
      label: 'From Photo',
      icon: <Camera className="w-4 h-4" />,
      description: 'Scan recipe from image'
    },
    {
      id: 'text',
      label: 'From Text',
      icon: <FileText className="w-4 h-4" />,
      description: 'Paste recipe text'
    },
    {
      id: 'file',
      label: 'From File',
      icon: <Upload className="w-4 h-4" />,
      description: 'Upload CSV or PDF'
    }
  ];

  const mockImportFromUrl = async (url: string): Promise<ImportedRecipeData> => {
    // Simulate API call to parse recipe from URL
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      title: 'Chocolate Chip Cookies',
      ingredients: [
        '2 1/4 cups all-purpose flour',
        '1 tsp baking soda',
        '1 tsp salt',
        '1 cup butter, softened',
        '3/4 cup granulated sugar',
        '3/4 cup brown sugar',
        '2 large eggs',
        '2 tsp vanilla extract',
        '2 cups chocolate chips'
      ],
      instructions: [
        'Preheat oven to 375°F (190°C)',
        'Mix flour, baking soda, and salt in a bowl',
        'Cream butter and sugars until fluffy',
        'Beat in eggs and vanilla',
        'Gradually add flour mixture',
        'Stir in chocolate chips',
        'Drop rounded tablespoons onto ungreased cookie sheets',
        'Bake 9-11 minutes until golden brown'
      ],
      servings: 48,
      prepTime: 15,
      cookTime: 11,
      imageUrl: '/images/meals/cookies.jpg',
      source: url,
      confidence: 92,
      errors: []
    };
  };

  const mockImportFromPhoto = async (file: File): Promise<ImportedRecipeData> => {
    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      title: 'Classic Banana Bread',
      ingredients: [
        '3 ripe bananas, mashed',
        '1/3 cup melted butter',
        '3/4 cup sugar',
        '1 egg, beaten',
        '1 tsp vanilla extract',
        '1 tsp baking soda',
        '1 1/2 cups all-purpose flour',
        'Pinch of salt'
      ],
      instructions: [
        'Preheat oven to 350°F (175°C)',
        'Mix melted butter with mashed bananas',
        'Mix in sugar, egg, and vanilla',
        'Sprinkle baking soda and salt over mixture and mix',
        'Add flour and mix until just combined',
        'Pour into a buttered loaf pan',
        'Bake for 60-65 minutes'
      ],
      servings: 8,
      prepTime: 10,
      cookTime: 65,
      confidence: 78,
      errors: ['Could not detect exact measurements for some ingredients']
    };
  };

  const mockImportFromText = async (text: string): Promise<ImportedRecipeData> => {
    // Simulate text parsing
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      title: 'Mediterranean Pasta Salad',
      ingredients: [
        '1 lb pasta (penne or fusilli)',
        '1 cup cherry tomatoes, halved',
        '1/2 cup red onion, diced',
        '1/2 cup olives, sliced',
        '1/2 cup feta cheese, crumbled',
        '1/4 cup olive oil',
        '2 tbsp red wine vinegar',
        '2 tsp dried oregano',
        'Salt and pepper to taste'
      ],
      instructions: [
        'Cook pasta according to package directions',
        'Drain and rinse with cold water',
        'Combine pasta with vegetables and cheese',
        'Whisk together oil, vinegar, and oregano',
        'Toss pasta with dressing',
        'Season with salt and pepper',
        'Chill before serving'
      ],
      servings: 6,
      prepTime: 20,
      cookTime: 10,
      confidence: 85,
      errors: []
    };
  };

  const handleImport = async () => {
    setIsLoading(true);
    setErrors([]);
    setImportedRecipes([]);

    try {
      let imported: ImportedRecipeData;

      switch (activeTab) {
        case 'url':
          if (!importData.url) {
            setErrors(['Please enter a URL']);
            setIsLoading(false);
            return;
          }
          imported = await mockImportFromUrl(importData.url);
          break;

        case 'photo':
          if (!importData.photo) {
            setErrors(['Please select a photo']);
            setIsLoading(false);
            return;
          }
          imported = await mockImportFromPhoto(importData.photo);
          break;

        case 'text':
          if (!importData.text?.trim()) {
            setErrors(['Please enter recipe text']);
            setIsLoading(false);
            return;
          }
          imported = await mockImportFromText(importData.text);
          break;

        case 'file':
          setErrors(['File import not yet implemented']);
          setIsLoading(false);
          return;

        default:
          setErrors(['Invalid import method']);
          setIsLoading(false);
          return;
      }

      setImportedRecipes([imported]);
      if (imported.errors.length > 0) {
        setErrors(imported.errors);
      }
    } catch (error) {
      setErrors(['Failed to import recipe. Please try again.']);
    }

    setIsLoading(false);
  };

  const handleConfirmImport = () => {
    const recipes: MealRecipe[] = importedRecipes.map((imported, index) => ({
      id: `imported-${Date.now()}-${index}`,
      familyId: 'family1',
      recipeName: imported.title,
      cuisineType: '',
      mealType: 'dinner', // Default, user can change later
      prepTime: imported.prepTime,
      cookTime: imported.cookTime,
      servings: imported.servings || 4,
      difficulty: 'medium', // Default
      ingredients: imported.ingredients.map(ing => {
        const parts = ing.split(' ');
        const quantity = parseFloat(parts[0]) || 1;
        const unit = parts[1] || '';
        const name = parts.slice(2).join(' ') || ing;
        return { name, quantity, unit };
      }),
      instructions: imported.instructions,
      nutritionInfo: imported.nutrition ? {
        calories: imported.nutrition.calories || 0,
        protein: imported.nutrition.protein || 0,
        carbs: imported.nutrition.carbs || 0,
        fat: imported.nutrition.fat || 0,
        fiber: imported.nutrition.fiber || 0,
        sugar: imported.nutrition.sugar || 0,
        sodium: imported.nutrition.sodium || 0,
        vitamins: imported.nutrition.vitamins,
        minerals: imported.nutrition.minerals
      } : undefined,
      imageUrl: imported.imageUrl,
      source: imported.source,
      tags: [],
      rating: 0,
      isFavorite: false,
      createdAt: new Date()
    }));

    onImport(recipes);
  };

  const renderUrlImport = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe URL
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="url"
            value={importData.url || ''}
            onChange={(e) => setImportData(prev => ({ ...prev, url: e.target.value }))}
            className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/recipe"
          />
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Supported Websites</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• AllRecipes, Food Network, BBC Good Food</li>
          <li>• Epicurious, Serious Eats, Bon Appétit</li>
          <li>• Recipe blogs with structured data</li>
        </ul>
      </div>
    </div>
  );

  const renderPhotoImport = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Photo
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImportData(prev => ({ ...prev, photo: e.target.files?.[0] }))}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {importData.photo ? importData.photo.name : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
          </label>
        </div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Photo Tips</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Ensure text is clear and well-lit</li>
          <li>• Avoid shadows and glare</li>
          <li>• Include ingredient lists and instructions</li>
        </ul>
      </div>
    </div>
  );

  const renderTextImport = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe Text
        </label>
        <textarea
          value={importData.text || ''}
          onChange={(e) => setImportData(prev => ({ ...prev, text: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={12}
          placeholder="Paste your recipe here including ingredients and instructions..."
        />
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Text Format Tips</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Include recipe title at the top</li>
          <li>• List ingredients with quantities</li>
          <li>• Number or separate instruction steps</li>
        </ul>
      </div>
    </div>
  );

  const renderFileImport = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recipe File
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Upload CSV or PDF file</p>
          <p className="text-xs text-gray-500 mt-1">CSV, PDF up to 5MB</p>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Supported Formats</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• CSV with columns: name, ingredients, instructions</li>
          <li>• PDF with structured recipe content</li>
          <li>• Multiple recipes per file supported</li>
        </ul>
      </div>
    </div>
  );

  const renderImportedRecipe = (recipe: ImportedRecipeData) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{recipe.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
            {recipe.prepTime && <span>Prep: {recipe.prepTime}min</span>}
            {recipe.cookTime && <span>Cook: {recipe.cookTime}min</span>}
            {recipe.servings && <span>Serves: {recipe.servings}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
            recipe.confidence >= 90 ? 'bg-green-100 text-green-800' :
            recipe.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {recipe.confidence >= 90 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            <span>{recipe.confidence}% confidence</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Ingredients</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {recipe.ingredients.slice(0, 8).map((ing, index) => (
              <li key={index}>• {ing}</li>
            ))}
            {recipe.ingredients.length > 8 && (
              <li className="text-gray-500">... and {recipe.ingredients.length - 8} more</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
          <ol className="text-sm text-gray-700 space-y-1">
            {recipe.instructions.slice(0, 5).map((inst, index) => (
              <li key={index}>{index + 1}. {inst}</li>
            ))}
            {recipe.instructions.length > 5 && (
              <li className="text-gray-500">... and {recipe.instructions.length - 5} more steps</li>
            )}
          </ol>
        </div>
      </div>

      {recipe.errors.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="font-medium text-yellow-900 mb-1">Import Warnings</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            {recipe.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Import Recipes</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isLoading && importedRecipes.length === 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-gray-600 mb-6">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>

                {activeTab === 'url' && renderUrlImport()}
                {activeTab === 'photo' && renderPhotoImport()}
                {activeTab === 'text' && renderTextImport()}
                {activeTab === 'file' && renderFileImport()}
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Recipe...</h3>
                <p className="text-gray-600">
                  {activeTab === 'url' && 'Parsing recipe from website...'}
                  {activeTab === 'photo' && 'Using OCR to extract recipe text...'}
                  {activeTab === 'text' && 'Processing recipe text...'}
                  {activeTab === 'file' && 'Processing uploaded file...'}
                </p>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-medium text-red-900">Import Errors</h4>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Imported Recipes */}
            {importedRecipes.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Imported Recipes</h3>
                  <p className="text-sm text-gray-600">{importedRecipes.length} recipe(s) found</p>
                </div>
                {importedRecipes.map((recipe, index) => (
                  <div key={index}>
                    {renderImportedRecipe(recipe)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            {importedRecipes.length === 0 && (
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isLoading ? 'Importing...' : 'Import Recipe'}</span>
              </button>
            )}
            {importedRecipes.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setImportedRecipes([]);
                    setErrors([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Import Another
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Add to Collection</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeImporter;