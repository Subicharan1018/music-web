/**
 * weightedRandom.js
 * Utility for selecting items randomly based on relative weights without replacement.
 */

/**
 * Selects `count` items from `items` array without replacement,
 * using `weights` array to determine selection probability.
 * 
 * @param {Array} items - The items to select from
 * @param {Array<number>} weights - The weights corresponding to each item
 * @param {number} count - The number of items to select
 * @returns {Array} - The selected items in the order they were picked
 */
export function weightedRandomSelect(items, weights, count) {
  if (!items || !weights || items.length !== weights.length) {
    throw new Error('Items and weights must be arrays of the same length');
  }

  const selectedCount = Math.min(count, items.length);
  if (selectedCount <= 0) return [];

  const result = [];
  
  // Clone items and weights so we can mutate them (without replacement)
  const availableItems = [...items];
  const availableWeights = [...weights];

  for (let i = 0; i < selectedCount; i++) {
    // Calculate total weight of remaining items
    const totalWeight = availableWeights.reduce((sum, w) => sum + w, 0);

    // If total weight is 0 (all remaining have 0 probability), 
    // fallback to a uniform random pick for the rest
    if (totalWeight <= 0) {
      const fallbackIndex = Math.floor(Math.random() * availableItems.length);
      result.push(availableItems[fallbackIndex]);
      availableItems.splice(fallbackIndex, 1);
      availableWeights.splice(fallbackIndex, 1);
      continue;
    }

    // Pick a random value between 0 and totalWeight
    let randomVal = Math.random() * totalWeight;
    let selectedIndex = -1;

    // Find the item that corresponds to the random value
    for (let j = 0; j < availableWeights.length; j++) {
      randomVal -= availableWeights[j];
      if (randomVal <= 0) {
        selectedIndex = j;
        break;
      }
    }

    // Fallback if rounding errors prevented selection
    if (selectedIndex === -1) selectedIndex = availableWeights.length - 1;

    // Add selected item to result
    result.push(availableItems[selectedIndex]);

    // Remove the selected item from available pools (without replacement)
    availableItems.splice(selectedIndex, 1);
    availableWeights.splice(selectedIndex, 1);
  }

  return result;
}
