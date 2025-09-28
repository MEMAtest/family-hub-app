'use client'

import React, { useState, useEffect } from 'react';
import { MealRecipe, RecipeFormData, RecipeSearchCriteria } from '@/types/meals.types';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Grid3X3,
  List,
  Star,
  Clock,
  Users,
  ChefHat,
  Edit,
  Trash2,
  Eye,
  Heart,
  Copy,
  Bookmark,
  Tag,
  Camera,
  Link,
  FileText
} from 'lucide-react';
import RecipeCard from './RecipeCard';
import RecipeForm from './RecipeForm';
import RecipeImporter from './RecipeImporter';

interface RecipeManagerProps {
  onClose?: () => void;
}

const RecipeManager: React.FC<RecipeManagerProps> = ({ onClose }) => {
  const [recipes, setRecipes] = useState<MealRecipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<MealRecipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<MealRecipe | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MealRecipe | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'difficulty' | 'prepTime' | 'recent'>('recent');
  const [filterCriteria, setFilterCriteria] = useState<RecipeSearchCriteria>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock recipes data
  const mockRecipes: MealRecipe[] = [
    {
      id: '1',
      familyId: 'family1',
      recipeName: 'Classic Pancakes',
      cuisineType: 'American',
      mealType: 'breakfast',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      difficulty: 'easy',
      ingredients: [
        { name: 'Flour', quantity: 2, unit: 'cups' },
        { name: 'Eggs', quantity: 2, unit: 'large' },
        { name: 'Milk', quantity: 1.5, unit: 'cups' },
        { name: 'Baking Powder', quantity: 2, unit: 'tsp' },
        { name: 'Salt', quantity: 0.5, unit: 'tsp' },
        { name: 'Sugar', quantity: 1, unit: 'tbsp' },
        { name: 'Butter', quantity: 2, unit: 'tbsp' }
      ],
      instructions: [
        'In a bowl, whisk together flour, baking powder, salt, and sugar',
        'In another bowl, beat eggs and then whisk in milk and melted butter',
        'Pour the wet ingredients into the dry ingredients and stir until just combined',
        'Heat a griddle or non-stick pan over medium heat',
        'Pour 1/4 cup of batter for each pancake onto the griddle',
        'Cook until bubbles form on surface, then flip and cook until golden brown'
      ],
      nutritionInfo: {
        calories: 180,
        protein: 6,
        carbs: 28,
        fat: 5,
        fiber: 1,
        sugar: 3,
        sodium: 380
      },
      imageUrl: '/images/meals/pancakes.jpg',
      source: 'Family Recipe',
      tags: ['breakfast', 'family-friendly', 'quick', 'weekend'],
      rating: 4.8,
      isFavorite: true,
      createdAt: new Date('2025-09-01')
    },
    {
      id: '2',
      familyId: 'family1',
      recipeName: 'Mediterranean Quinoa Bowl',
      cuisineType: 'Mediterranean',
      mealType: 'lunch',
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      difficulty: 'medium',
      ingredients: [
        { name: 'Quinoa', quantity: 1, unit: 'cup' },
        { name: 'Cherry Tomatoes', quantity: 2, unit: 'cups' },
        { name: 'Cucumber', quantity: 1, unit: 'large' },
        { name: 'Red Onion', quantity: 0.5, unit: 'medium' },
        { name: 'Feta Cheese', quantity: 0.5, unit: 'cup' },
        { name: 'Olives', quantity: 0.25, unit: 'cup' },
        { name: 'Olive Oil', quantity: 3, unit: 'tbsp' },
        { name: 'Lemon Juice', quantity: 2, unit: 'tbsp' }
      ],
      instructions: [
        'Rinse quinoa and cook according to package directions',
        'While quinoa cooks, dice cucumber and red onion',
        'Halve cherry tomatoes',
        'In a large bowl, combine cooked quinoa with vegetables',
        'Whisk olive oil and lemon juice together',
        'Toss quinoa mixture with dressing',
        'Top with feta cheese and olives',
        'Season with salt and pepper to taste'
      ],
      nutritionInfo: {
        calories: 320,
        protein: 12,
        carbs: 45,
        fat: 16,
        fiber: 6,
        sugar: 8,
        sodium: 480
      },
      tags: ['lunch', 'healthy', 'vegetarian', 'meal-prep'],
      rating: 4.6,
      isFavorite: false,
      createdAt: new Date('2025-09-05')
    },
    {
      id: '3',
      familyId: 'family1',
      recipeName: 'Slow Cooker Beef Stew',
      cuisineType: 'American',
      mealType: 'dinner',
      prepTime: 30,
      cookTime: 480,
      servings: 6,
      difficulty: 'easy',
      ingredients: [
        { name: 'Beef Chuck Roast', quantity: 2, unit: 'lbs' },
        { name: 'Potatoes', quantity: 4, unit: 'large' },
        { name: 'Carrots', quantity: 4, unit: 'large' },
        { name: 'Onion', quantity: 1, unit: 'large' },
        { name: 'Beef Broth', quantity: 3, unit: 'cups' },
        { name: 'Tomato Paste', quantity: 2, unit: 'tbsp' },
        { name: 'Worcestershire Sauce', quantity: 1, unit: 'tbsp' },
        { name: 'Bay Leaves', quantity: 2, unit: 'whole' }
      ],
      instructions: [
        'Cut beef into 2-inch cubes and season with salt and pepper',
        'Brown beef in a large skillet over medium-high heat',
        'Transfer beef to slow cooker',
        'Add chopped vegetables to slow cooker',
        'In a bowl, whisk together broth, tomato paste, and Worcestershire sauce',
        'Pour mixture over beef and vegetables',
        'Add bay leaves and cover',
        'Cook on low for 8 hours or high for 4 hours',
        'Remove bay leaves before serving'
      ],
      nutritionInfo: {
        calories: 420,
        protein: 35,
        carbs: 28,
        fat: 18,
        fiber: 4,
        sugar: 6,
        sodium: 680
      },
      tags: ['dinner', 'comfort-food', 'slow-cooker', 'hearty'],
      rating: 4.9,
      isFavorite: true,
      createdAt: new Date('2025-09-10')
    }
  ];

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setRecipes(mockRecipes);
      setFilteredRecipes(mockRecipes);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    filterAndSortRecipes();
  }, [searchTerm, filterCriteria, sortBy, recipes]);

  const filterAndSortRecipes = () => {
    let filtered = [...recipes];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        recipe.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.cuisineType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Advanced filters
    if (filterCriteria.mealType) {
      filtered = filtered.filter(recipe => recipe.mealType === filterCriteria.mealType);
    }
    if (filterCriteria.difficulty) {
      filtered = filtered.filter(recipe => recipe.difficulty === filterCriteria.difficulty);
    }
    if (filterCriteria.cuisine) {
      filtered = filtered.filter(recipe => recipe.cuisineType === filterCriteria.cuisine);
    }
    if (filterCriteria.maxPrepTime) {
      filtered = filtered.filter(recipe => (recipe.prepTime || 0) <= filterCriteria.maxPrepTime!);
    }
    if (filterCriteria.dietary && filterCriteria.dietary.length > 0) {
      filtered = filtered.filter(recipe =>
        filterCriteria.dietary!.some(diet => recipe.tags.includes(diet))
      );
    }

    // Sort recipes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.recipeName.localeCompare(b.recipeName);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'prepTime':
          return (a.prepTime || 0) - (b.prepTime || 0);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredRecipes(filtered);
  };

  const handleCreateRecipe = () => {
    setEditingRecipe(null);
    setShowRecipeForm(true);
  };

  const handleEditRecipe = (recipe: MealRecipe) => {
    setEditingRecipe(recipe);
    setShowRecipeForm(true);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    }
  };

  const handleSaveRecipe = (formData: RecipeFormData) => {
    if (editingRecipe) {
      // Update existing recipe
      const updatedRecipe: MealRecipe = {
        ...editingRecipe,
        ...formData,
        createdAt: editingRecipe.createdAt
      };
      setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? updatedRecipe : r));
    } else {
      // Create new recipe
      const newRecipe: MealRecipe = {
        id: `recipe-${Date.now()}`,
        familyId: 'family1',
        ...formData,
        rating: 0,
        isFavorite: false,
        createdAt: new Date()
      };
      setRecipes(prev => [newRecipe, ...prev]);
    }
    setShowRecipeForm(false);
    setEditingRecipe(null);
  };

  const handleToggleFavorite = (recipe: MealRecipe) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipe.id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
  };

  const handleDuplicateRecipe = (recipe: MealRecipe) => {
    const duplicatedRecipe: MealRecipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      recipeName: `${recipe.recipeName} (Copy)`,
      createdAt: new Date()
    };
    setRecipes(prev => [duplicatedRecipe, ...prev]);
  };

  const getUniqueCuisines = () => {
    const cuisines = recipes.map(r => r.cuisineType).filter(Boolean);
    return [...new Set(cuisines)];
  };

  const getUniqueTags = () => {
    const allTags = recipes.flatMap(r => r.tags);
    return [...new Set(allTags)];
  };

  const renderRecipeGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredRecipes.map(recipe => (
        <div key={recipe.id} className="relative group">
          <RecipeCard
            recipe={recipe}
            onSelect={setSelectedRecipe}
            onAddToFavorites={handleToggleFavorite}
            showActions={false}
          />
          {/* Hover Actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <button
                onClick={() => setSelectedRecipe(recipe)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-50"
                title="View Recipe"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => handleEditRecipe(recipe)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-50"
                title="Edit Recipe"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => handleDuplicateRecipe(recipe)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-gray-50"
                title="Duplicate Recipe"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => handleDeleteRecipe(recipe.id)}
                className="p-1 bg-white rounded-md shadow-sm hover:bg-red-50"
                title="Delete Recipe"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecipeList = () => (
    <div className="space-y-4">
      {filteredRecipes.map(recipe => (
        <div key={recipe.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{recipe.recipeName}</h3>
                <p className="text-sm text-gray-600">{recipe.cuisineType} • {recipe.mealType}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}min</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{recipe.servings}</span>
                  </span>
                  {recipe.rating && (
                    <span className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span>{recipe.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {recipe.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-current" />}
              <button
                onClick={() => setSelectedRecipe(recipe)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEditRecipe(recipe)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteRecipe(recipe.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading recipes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Recipe Manager</h1>
            <p className="text-gray-600">Manage your family's recipe collection</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImporter(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={handleCreateRecipe}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recipe</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes, ingredients, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name A-Z</option>
              <option value="rating">Highest Rated</option>
              <option value="difficulty">Easiest First</option>
              <option value="prepTime">Quickest First</option>
            </select>
          </div>
          <div className="flex items-center border border-gray-300 rounded-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                <select
                  value={filterCriteria.mealType || ''}
                  onChange={(e) => setFilterCriteria(prev => ({ ...prev, mealType: e.target.value as any || undefined }))}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2"
                >
                  <option value="">All meals</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snacks</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={filterCriteria.difficulty || ''}
                  onChange={(e) => setFilterCriteria(prev => ({ ...prev, difficulty: e.target.value as any || undefined }))}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2"
                >
                  <option value="">All difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                <select
                  value={filterCriteria.cuisine || ''}
                  onChange={(e) => setFilterCriteria(prev => ({ ...prev, cuisine: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2"
                >
                  <option value="">All cuisines</option>
                  {getUniqueCuisines().map(cuisine => (
                    <option key={cuisine} value={cuisine}>{cuisine}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Prep Time</label>
                <select
                  value={filterCriteria.maxPrepTime || ''}
                  onChange={(e) => setFilterCriteria(prev => ({ ...prev, maxPrepTime: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2"
                >
                  <option value="">Any time</option>
                  <option value="15">Under 15 min</option>
                  <option value="30">Under 30 min</option>
                  <option value="60">Under 1 hour</option>
                  <option value="120">Under 2 hours</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recipe Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredRecipes.length} of {recipes.length} recipes
        </p>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-1 text-sm border border-gray-300 rounded-sm hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Recipe Display */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || Object.keys(filterCriteria).length > 0
              ? 'Try adjusting your search or filters'
              : 'Start building your recipe collection'}
          </p>
          <button
            onClick={handleCreateRecipe}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Recipe</span>
          </button>
        </div>
      ) : (
        viewMode === 'grid' ? renderRecipeGrid() : renderRecipeList()
      )}

      {/* Recipe Form Modal */}
      {showRecipeForm && (
        <RecipeForm
          recipe={editingRecipe}
          onSave={handleSaveRecipe}
          onClose={() => {
            setShowRecipeForm(false);
            setEditingRecipe(null);
          }}
        />
      )}

      {/* Recipe Importer Modal */}
      {showImporter && (
        <RecipeImporter
          onImport={(recipes) => {
            setRecipes(prev => [...recipes, ...prev]);
            setShowImporter(false);
          }}
          onClose={() => setShowImporter(false)}
        />
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Recipe detail content would go here */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedRecipe.recipeName}</h2>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600">Recipe details would be displayed here...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeManager;