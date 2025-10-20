// TheMealDB API Base URL
const BASE_API_URL = 'https://www.themealdb.com/api/json/v1/1/';
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
const dietPreferenceEl = document.getElementById('diet-preference');

// Store the last fetched meal data
let currentMealData = null;

// NEW: Cache for recently viewed meal IDs to prevent frequent repeats.
// The Set will store meal IDs (strings) that have been shown recently.
const viewedMealIds = new Set();
const MAX_CACHE_SIZE = 10; // Only remember the last 10 unique meals

/**
 * Fetches a random recipe from the API and updates the UI, now supporting dietary filters and anti-repetition.
 */
const fetchRandomRecipe = async () => {
    // Show loading spinner and hide recipe card
    loadingSpinner.classList.remove('hidden');
    recipeCard.classList.add('hidden');

    const preference = dietPreferenceEl.value;
    let recipeData = null;
    let mealId = null;

    try {
        if (preference === 'random') {
            // Case 1: Original random recipe fetch (random.php) - Cannot use cache easily here, 
            // as 'random.php' returns only one meal, so we accept occasional repeats for true randomness.
            const response = await fetch(`${BASE_API_URL}random.php`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.meals && data.meals.length > 0) {
                recipeData = data.meals[0];
            }

        } else {
            // Case 2: Filtered recipe fetch (filter.php then lookup.php)
            // This is where the anti-repetition logic is essential.

            // Step 1: Filter meals by the selected category (e.g., 'Vegetarian' or 'Chicken')
            const filterUrl = `${BASE_API_URL}filter.php?c=${preference}`;
            const filterResponse = await fetch(filterUrl);
            
            if (!filterResponse.ok) throw new Error(`Filter HTTP error! status: ${filterResponse.status}`);
            const filterData = await filterResponse.json();

            if (!filterData.meals || filterData.meals.length === 0) {
                displayError(`No ${preference} recipes found. Please try 'Any Recipe'.`);
                return;
            }

            // Step 2: Select a random, *non-repeated* meal ID from the filtered list
            const mealsList = filterData.meals;
            let attemptCount = 0;
            const maxAttempts = 5; // Limit attempts to prevent infinite loops if the list is tiny/all cached

            while (mealId === null && attemptCount < maxAttempts) {
                const randomIndex = Math.floor(Math.random() * mealsList.length);
                const candidateId = mealsList[randomIndex].idMeal;

                if (!viewedMealIds.has(candidateId)) {
                    // Found a new, unseen meal ID
                    mealId = candidateId;
                }
                attemptCount++;
            }
            
            // Fallback: If after maxAttempts we can't find a new one (i.e., we've seen everything), clear the cache and pick one
            if (mealId === null) {
                console.warn('All filtered meals have been seen recently. Clearing cache to force a new selection.');
                viewedMealIds.clear();
                const randomIndex = Math.floor(Math.random() * mealsList.length);
                mealId = mealsList[randomIndex].idMeal;
            }

            // Step 3: Lookup full details for the random meal ID
            const lookupUrl = `${BASE_API_URL}lookup.php?i=${mealId}`;
            const lookupResponse = await fetch(lookupUrl);

            if (!lookupResponse.ok) throw new Error(`Lookup HTTP error! status: ${lookupResponse.status}`);
            const lookupData = await lookupResponse.json();

            if (lookupData.meals && lookupData.meals.length > 0) {
                recipeData = lookupData.meals[0];
                
                // Add the newly shown meal ID to the cache
                if (viewedMealIds.size >= MAX_CACHE_SIZE) {
                    // Remove the oldest entry (the first one added) to make space
                    viewedMealIds.delete(viewedMealIds.values().next().value);
                }
                viewedMealIds.add(mealId);

            } else {
                displayError('Could not retrieve full recipe details. Please try again.');
                return;
            }
        }
        
        // Final check and UI update
        if (recipeData) {
            currentMealData = recipeData;
            updateUI(recipeData);
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
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];

        // Check if ingredient and measure exist and are not empty
        if (ingredient && ingredient.trim() !== '' && measure && measure.trim() !== '') {
            const listItem = document.createElement('li');
            listItem.classList.add('flex', 'items-start');

            // Ingredient image (optional, based on API availability)
            const img = document.createElement('img');
            img.src = `${INGREDIENT_IMG_URL}${ingredient.replace(/ /g, '%20')}.png`;
            img.alt = ingredient;
            img.classList.add('w-8', 'h-8', 'object-contain', 'mr-3', 'flex-shrink-0');

            // Text content
            const textSpan = document.createElement('span');
            textSpan.innerHTML = `<span class="font-semibold text-white">${measure}</span> of ${ingredient}`;
            textSpan.classList.add('flex-grow');

            listItem.appendChild(img);
            listItem.appendChild(textSpan);
            ingredientsListEl.appendChild(listItem);

            // Show action buttons if at least one ingredient is found
            youtubeLinkEl.classList.remove('hidden');
            copyBtnEl.classList.remove('hidden');
        }
    }

    // Set instructions
    // Replaces newlines with paragraph tags for better formatting on the UI
    const instructions = meal.strInstructions ? meal.strInstructions.trim().split('\n').map(p => `<p class="mb-4">${p}</p>`).join('') : '<p>Instructions not available.</p>';
    mealInstructionsEl.innerHTML = instructions;

    // Set YouTube link
    if (meal.strYoutube && meal.strYoutube.trim() !== '') {
        youtubeLinkEl.href = meal.strYoutube;
        youtubeLinkEl.classList.remove('hidden');
    } else {
        youtubeLinkEl.classList.add('hidden');
    }
};


/**
 * Copies the ingredients list to the clipboard.
 */
const copyIngredients = () => {
    if (!currentMealData) return;

    let ingredientsText = '--- Ingredients List ---\n';
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
 * Displays a temporary message box.
 * @param {string} message The message to display.
 */
const showMessage = (message) => {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    // NOTE: You'll need to define 'animate-fadeIn' and 'animate-fadeOut' in your CSS or Tailwind config 
    // if you want the smooth animation effect. This assumes a basic fade/slide effect.
    messageBox.classList.add('opacity-100', 'transition-opacity'); 

    // Hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        
        // Wait for transition before fully hiding the element
        setTimeout(() => {
            messageBox.classList.add('hidden');
            messageBox.classList.remove('opacity-0', 'transition-opacity');
        }, 500); 
    }, 3000);
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
// When a filter changes, clear the cache to ensure we start a fresh search
dietPreferenceEl.addEventListener('change', () => { viewedMealIds.clear(); fetchRandomRecipe(); }); 

// Fetch a recipe on page load
fetchRandomRecipe();
