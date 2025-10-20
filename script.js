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
const countryPreferenceEl = document.getElementById('country-preference'); // NEW ELEMENT

// Store the last fetched meal data
let currentMealData = null;

/**
 * Fetches the list of all available meal areas (countries/cuisines) and populates the dropdown.
 */
const populateCountryDropdown = async () => {
    try {
        const response = await fetch(`${BASE_API_URL}list.php?a=list`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.meals) {
            data.meals.forEach(area => {
                const option = document.createElement('option');
                option.value = area.strArea;
                option.textContent = area.strArea;
                countryPreferenceEl.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to populate country dropdown:', error);
        // Display a small message or log the error, but don't halt the app
    }
};

/**
 * Determines the API URL based on user selections.
 * Note: TheMealDB free API only allows ONE filter (Category OR Area) OR a Random call.
 * We prioritize the most restrictive filter: Diet Category first, then Country.
 * If both are set, we currently only use the Diet Category (c=) to ensure the veg/non-veg choice is respected.
 * If you need both filters, you would need a more complex, multi-step search or a different API.
 * * @param {string} diet The selected dietary preference ('Any', 'Vegetarian', 'Chicken').
 * @param {string} country The selected country/area ('Any', 'Canadian', etc.).
 * @returns {string} The constructed API filter URL.
 */
const getFilterUrl = (diet, country) => {
    const isDietFiltered = (diet !== 'Any');
    const isCountryFiltered = (country !== 'Any');

    if (isDietFiltered) {
        // Prioritize Diet filtering as it's the core new feature
        return `${BASE_API_URL}filter.php?c=${diet}`;
    } else if (isCountryFiltered) {
        // Fallback to Country filtering if only country is selected
        return `${BASE_API_URL}filter.php?a=${country}`;
    } else {
        // Default to a completely random meal
        return `${BASE_API_URL}random.php`;
    }
}


/**
 * Fetches a random recipe from the API and updates the UI.
 */
const fetchRandomRecipe = async () => {
    // Show loading spinner and hide recipe card
    loadingSpinner.classList.remove('hidden');
    recipeCard.classList.add('hidden');

    const dietPreference = dietPreferenceEl.value;
    const countryPreference = countryPreferenceEl.value;
    const filterUrl = getFilterUrl(dietPreference, countryPreference);
    
    let recipeData = null;

    try {
        if (filterUrl.includes('random.php')) {
            // Case 1: Completely random recipe fetch
            const response = await fetch(filterUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.meals && data.meals.length > 0) {
                recipeData = data.meals[0];
            }

        } else {
            // Case 2: Filtered recipe fetch (filter.php then lookup.php)

            // Step 1: Filter meals by the selected criteria (Category or Area)
            const filterResponse = await fetch(filterUrl);
            
            if (!filterResponse.ok) throw new Error(`Filter HTTP error! status: ${filterResponse.status}`);
            const filterData = await filterResponse.json();

            if (!filterData.meals || filterData.meals.length === 0) {
                // Determine the filter type for the error message
                const filterType = filterUrl.includes('?c=') ? 'category' : 'cuisine';
                const filterValue = filterUrl.split('=').pop();
                displayError(`No recipes found for the selected ${filterType}: ${decodeURIComponent(filterValue)}. Please try a different selection.`);
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

// --- UI Utility Functions ---

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

            // Ingredient image (optional)
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
        const textContent = ingredientsItems[i].textContent.trim();
        ingredientsText += `- ${textContent}\n`;
    }

    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = ingredientsText;
    document.body.appendChild(tempTextArea);

    tempTextArea.select();
    document.execCommand('copy');
    
    document.body.removeChild(tempTextArea);

    showMessage('Ingredients copied to clipboard!');
};


/**
 * Displays a temporary message box.
 * @param {string} message The message to display.
 */
const showMessage = (message) => {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    messageBox.classList.add('animate-fadeIn');

    setTimeout(() => {
        messageBox.classList.remove('animate-fadeIn');
        messageBox.classList.add('animate-fadeOut');
        
        setTimeout(() => {
            messageBox.classList.remove('animate-fadeOut');
            messageBox.classList.add('hidden');
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


// --- Initialization ---

// Setup function to run on page load
const initializeApp = () => {
    populateCountryDropdown();
    // Initial fetch
    fetchRandomRecipe();
};

// Add event listeners
getRecipeBtn.addEventListener('click', fetchRandomRecipe);
copyBtnEl.addEventListener('click', copyIngredients);
dietPreferenceEl.addEventListener('change', fetchRandomRecipe); 
countryPreferenceEl.addEventListener('change', fetchRandomRecipe); // NEW EVENT LISTENER

// Run the initialization function
initializeApp();
