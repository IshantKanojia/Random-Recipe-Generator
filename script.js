// API endpoint to get a random recipe
const API_URL = 'https://www.themealdb.com/api/json/v1/1/random.php';
// API endpoint for ingredient images
const INGREDIENT_IMG_URL = 'https://www.themealdb.com/images/ingredients/';

// Get references to HTML elements
const getRecipeBtn = document.getElementById('get-recipe-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const recipeCard = document.getElementById('recipe-card');
const mealNameEl = document.getElementById('meal-name');
const mealImageEl = document.getElementById('meal-image');
const ingredientsListEl = document.getElementById('ingredients-list');
const mealInstructionsEl = document.getElementById('meal-instructions');
const youtubeLinkEl = document.getElementById('youtube-link');
const copyBtnEl = document.getElementById('copy-btn');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');

// Store the last fetched meal data
let currentMealData = null;

/**
 * Fetches a random recipe from the API and updates the UI.
 */
const fetchRandomRecipe = async () => {
    // Show loading spinner and hide recipe card
    loadingSpinner.classList.remove('hidden');
    recipeCard.classList.add('hidden');

    try {
        // Fetch data from the API
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Check if a meal was returned
        if (data.meals && data.meals.length > 0) {
            const meal = data.meals[0];
            currentMealData = meal;
            updateUI(meal);
        } else {
            displayError('No recipe found. Please try again.');
        }

    } catch (error) {
        console.error('Failed to fetch recipe:', error);
        displayError('An error occurred while fetching the recipe. Please try again later.');
    } finally {
        // Hide loading spinner and show recipe card
        loadingSpinner.classList.add('hidden');
        recipeCard.classList.remove('hidden');
    }
};

/**
 * Updates the HTML elements with the meal data.
 * @param {object} meal The meal object from the API response.
 */
const updateUI = (meal) => {
    // Set meal name and image
    mealNameEl.textContent = meal.strMeal;
    mealImageEl.src = meal.strMealThumb;

    // Clear previous ingredients
    ingredientsListEl.innerHTML = '';
    // Hide action buttons initially
    youtubeLinkEl.classList.add('hidden');
    copyBtnEl.classList.add('hidden');

    // Populate ingredients list
    // The API provides ingredients and measures in separate, numbered fields (strIngredient1-20, strMeasure1-20)
    let ingredientsContent = '';
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];

        // Stop if the ingredient is null or an empty string
        if (ingredient && ingredient.trim() !== '') {
            const listItem = document.createElement('li');
            listItem.classList.add('flex', 'items-center', 'space-x-3', 'text-lg');

            // Create image element for the ingredient
            const ingredientImage = document.createElement('img');
            ingredientImage.src = `${INGREDIENT_IMG_URL}${ingredient.replace(/\s/g, '%20')}-Small.png`;
            ingredientImage.alt = ingredient;
            ingredientImage.classList.add('w-8', 'h-8', 'rounded-full', 'border', 'border-gray-500', 'flex-shrink-0');
            ingredientImage.onerror = function() {
                this.src = 'https://placehold.co/32x32/374151/D1D5DB?text=%3F';
            };
            
            const ingredientTextSpan = document.createElement('span');
            const ingredientText = `${measure} ${ingredient}`;
            ingredientTextSpan.textContent = ingredientText;
            ingredientTextSpan.classList.add('text-gray-300');

            listItem.appendChild(ingredientImage);
            listItem.appendChild(ingredientTextSpan);
            ingredientsListEl.appendChild(listItem);
            
            ingredientsContent += `- ${ingredientText}\n`;
        }
    }

    // Set instructions
    mealInstructionsEl.textContent = meal.strInstructions;

    // Show copy button if there are ingredients
    if (ingredientsContent !== '') {
        copyBtnEl.classList.remove('hidden');
    }

    // Show YouTube link if available
    if (meal.strYoutube && meal.strYoutube.trim() !== '') {
        youtubeLinkEl.href = meal.strYoutube;
        youtubeLinkEl.classList.remove('hidden');
    }
};

/**
 * Displays a temporary notification message to the user.
 * @param {string} message The message to display.
 */
const showMessage = (message) => {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
};

/**
 * Copies the ingredients list to the clipboard.
 */
const copyIngredients = () => {
    let ingredientsText = 'Ingredients:\n';
    const ingredientsItems = ingredientsListEl.getElementsByTagName('li');
    for (let i = 0; i < ingredientsItems.length; i++) {
        // Get the text content, excluding the image alt text
        const textContent = ingredientsItems[i].textContent.trim();
        ingredientsText += `- ${textContent}\n`;
    }

    // Create a temporary textarea to hold the text
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = ingredientsText;
    document.body.appendChild(tempTextArea);

    // Select and copy the text
    tempTextArea.select();
    document.execCommand('copy');
    
    // Remove the temporary textarea
    document.body.removeChild(tempTextArea);

    // Show a success message
    showMessage('Ingredients copied to clipboard!');
};

/**
 * Displays an error message on the UI.
 * @param {string} message The error message to display.
 */
const displayError = (message) => {
    mealNameEl.textContent = 'Error';
    mealImageEl.src = 'https://placehold.co/600x400/D1D5DB/1F2937?text=Error';
    ingredientsListEl.innerHTML = `<li class="text-red-400">${message}</li>`;
    mealInstructionsEl.textContent = '';
    youtubeLinkEl.classList.add('hidden');
    copyBtnEl.classList.add('hidden');
};

// Add event listeners
getRecipeBtn.addEventListener('click', fetchRandomRecipe);
copyBtnEl.addEventListener('click', copyIngredients);

// Fetch a recipe on page load
window.onload = fetchRandomRecipe;
