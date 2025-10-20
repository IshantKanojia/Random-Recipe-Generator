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
// NEW: Reference to the dietary preference dropdown
const dietPreferenceEl = document.getElementById('diet-preference');

// Store the last fetched meal data
let currentMealData = null;

/**
 * Fetches a random recipe from the API and updates the UI, now supporting dietary filters.
 */
const fetchRandomRecipe = async () => {
    // Show loading spinner and hide recipe card
    loadingSpinner.classList.remove('hidden');
    recipeCard.classList.add('hidden');

    // Get the selected preference
    const preference = dietPreferenceEl.value;
    let recipeData = null;

    try {
        if (preference === 'random') {
            // Case 1: Original random recipe fetch (random.php)
            const response = await fetch(`${BASE_API_URL}random.php`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.meals && data.meals.length > 0) {
                recipeData = data.meals[0];
            }

        } else {
            // Case 2: Filtered recipe fetch (filter.php then lookup.php)

            // Step 1: Filter meals by the selected category (e.g., 'Vegetarian' or 'Chicken')
            const filterUrl = `${BASE_API_URL}filter.php?c=${preference}`;
            const filterResponse = await fetch(filterUrl);
            
            if (!filterResponse.ok) throw new Error(`Filter HTTP error! status: ${filterResponse.status}`);
            const filterData = await filterResponse.json();

            if (!filterData.meals || filterData.meals.length === 0) {
                // If filter returns null, display an error
                displayError(`No ${preference} recipes found. Please try 'Any Recipe'.`);
                return;
            }

            // Step 2: Select a random meal ID from the filtered list
            const mealsList = filterData.meals;
            const randomIndex = Math.floor(Math.random() * mealsList.length);
            const mealId = mealsList[randomIndex].idMeal;

            // Step 3: Lookup full details for the random meal ID
            const lookupUrl = `${BASE_API_URL}lookup.php?i=${mealId}`;
            const lookupResponse = await fetch(lookupUrl);

            if (!lookupResponse.ok) throw new Error(`Lookup HTTP error! status: ${lookupResponse.status}`);
            const lookupData = await lookupResponse.json();

            if (lookupData.meals && lookupData.meals.length > 0) {
                recipeData = lookupData.meals[0];
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
    messageBox.classList.add('animate-fadeIn'); // Assuming you have a CSS fade-in animation

    // Hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove('animate-fadeIn');
        messageBox.classList.add('animate-fadeOut'); // Assuming you have a CSS fade-out animation
        
        // Wait for fade-out animation to finish before hiding
        setTimeout(() => {
            messageBox.classList.remove('animate-fadeOut');
            messageBox.classList.add('hidden');
        }, 500); // Wait for animation duration
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
// We also want to fetch a new recipe whenever the user changes the diet preference
dietPreferenceEl.addEventListener('change', fetchRandomRecipe); 

// Fetch a recipe on page load
fetchRandomRecipe();
