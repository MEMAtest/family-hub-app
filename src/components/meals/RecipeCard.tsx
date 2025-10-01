'use client'

import React from 'react';
import { MealRecipe } from '@/types/meals.types';
import {
  Clock,
  Users,
  Star,
  ChefHat,
  Heart,
  Share2,
  Printer,
  Plus,
  Utensils,
  Coffee,
  Sandwich,
  Moon
} from 'lucide-react';

interface RecipeCardProps {
  recipe: MealRecipe;
  size?: 'small' | 'medium' | 'large';
  onSelect?: (recipe: MealRecipe) => void;
  onAddToFavorites?: (recipe: MealRecipe) => void;
  onAddToMealPlan?: (recipe: MealRecipe) => void;
  showActions?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  size = 'medium',
  onSelect,
  onAddToFavorites,
  onAddToMealPlan,
  showActions = true
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="w-4 h-4" />;
      case 'lunch': return <Sandwich className="w-4 h-4" />;
      case 'dinner': return <Utensils className="w-4 h-4" />;
      case 'snack': return <Moon className="w-4 h-4" />;
      default: return <ChefHat className="w-4 h-4" />;
    }
  };

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  const cardSizeClasses = {
    small: 'w-full max-w-sm',
    medium: 'w-full max-w-md',
    large: 'w-full max-w-lg'
  };

  const imageSizeClasses = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64'
  };

  return (
    <div
      className={`${cardSizeClasses[size]} bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => onSelect?.(recipe)}
    >
      {/* Recipe Image */}
      <div className={`${imageSizeClasses[size]} bg-gray-100 relative overflow-hidden`}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.recipeName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <ChefHat className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-800">
            {getMealTypeIcon(recipe.mealType)}
            <span className="ml-1 capitalize">{recipe.mealType}</span>
          </span>
        </div>

        {/* Favorite icon */}
        {recipe.isFavorite && (
          <div className="absolute top-2 right-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
          </div>
        )}
      </div>

      {/* Recipe Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-medium text-gray-900 mb-1 line-clamp-2">
            {recipe.recipeName}
          </h3>
          {recipe.cuisineType && (
            <p className="text-sm text-gray-600">{recipe.cuisineType} Cuisine</p>
          )}
        </div>

        {/* Recipe Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{totalTime}min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings}</span>
          </div>
          {recipe.rating && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span>{recipe.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Nutrition Summary */}
        {recipe.nutritionInfo && (
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
            <div className="text-center">
              <div className="font-medium text-gray-900">{recipe.nutritionInfo.calories}</div>
              <div>calories</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{recipe.nutritionInfo.protein}g</div>
              <div>protein</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{recipe.nutritionInfo.carbs}g</div>
              <div>carbs</div>
            </div>
          </div>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Quick Preview */}
        {size !== 'small' && (
          <div className="text-xs text-gray-600 mb-3">
            <div className="font-medium mb-1">Key Ingredients:</div>
            <div className="line-clamp-2">
              {recipe.ingredients.slice(0, 4).map(ing => ing.name).join(', ')}
              {recipe.ingredients.length > 4 && '...'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToFavorites?.(recipe);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Add to favorites"
              >
                <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'text-red-500 fill-current' : ''}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle share
                  if (navigator.share) {
                    navigator.share({
                      title: recipe.recipeName,
                      text: `Check out this ${recipe.cuisineType} recipe: ${recipe.recipeName}`,
                      url: window.location.href
                    }).catch(console.error);
                  } else {
                    // Fallback for browsers without Web Share API
                    navigator.clipboard.writeText(`${recipe.recipeName} - ${recipe.cuisineType} recipe`);
                    alert('Recipe link copied to clipboard!');
                  }
                }}
                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                title="Share recipe"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle print
                  const printContent = `
                    <h1>${recipe.recipeName}</h1>
                    <p><strong>Cuisine:</strong> ${recipe.cuisineType}</p>
                    <p><strong>Prep Time:</strong> ${recipe.prepTime} minutes</p>
                    <p><strong>Cook Time:</strong> ${recipe.cookTime} minutes</p>
                    <p><strong>Servings:</strong> ${recipe.servings}</p>
                    <p><strong>Difficulty:</strong> ${recipe.difficulty}</p>

                    <h2>Ingredients:</h2>
                    <ul>
                      ${recipe.ingredients.map(ing => `<li>${ing.quantity} ${ing.unit} ${ing.name}</li>`).join('')}
                    </ul>

                    <h2>Instructions:</h2>
                    <ol>
                      ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
                    </ol>

                    ${recipe.nutritionInfo ? `
                      <h2>Nutrition Information:</h2>
                      <p>Calories: ${recipe.nutritionInfo.calories}</p>
                      <p>Protein: ${recipe.nutritionInfo.protein}g</p>
                      <p>Carbs: ${recipe.nutritionInfo.carbs}g</p>
                      <p>Fat: ${recipe.nutritionInfo.fat}g</p>
                    ` : ''}
                  `;

                  const printWindow = window.open('', '_blank');
                  printWindow?.document.write(`
                    <html>
                      <head>
                        <title>${recipe.recipeName}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          h1, h2 { color: #333; }
                          ul, ol { padding-left: 20px; }
                        </style>
                      </head>
                      <body>${printContent}</body>
                    </html>
                  `);
                  printWindow?.document.close();
                  printWindow?.print();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                title="Print recipe"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToMealPlan?.(recipe);
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Plan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;