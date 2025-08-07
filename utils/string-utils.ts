/**
 * Capitalizes the first letter of each word in a name
 * @param name - The name to capitalize
 * @returns The name with first letter of each word capitalized
 */
export const capitalizeFirstLetters = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .trim()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Gets the first name from a full name and capitalizes it
 * @param fullName - The full name
 * @returns The capitalized first name
 */
export const getCapitalizedFirstName = (fullName: string): string => {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }
  
  const words = fullName.trim().split(' ');
  const firstName = words[0] || '';
  
  if (firstName.length === 0) return firstName;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

/**
 * Extract a user-friendly name from various name formats
 * @param fullName - The full name or username to process
 * @returns A user-friendly display name
 */
export const extractDisplayName = (fullName: string): string => {
  if (!fullName) return 'User';
  
  const name = fullName.trim();
  
  // If it contains spaces, take the first part (proper name)
  if (name.includes(' ')) {
    const firstName = name.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  
  // Handle auto-generated names like "User 1234" - extract the "User" part
  if (name.startsWith('User ') && name.length > 5) {
    return 'User'; // Just return "User" for auto-generated names
  }
  
  // Handle usernames like "shahumesh2018" - extract alphabetic part before numbers
  const alphabeticPart = name.match(/^[a-zA-Z]+/);
  if (alphabeticPart) {
    const extractedName = alphabeticPart[0];
    // Capitalize first letter and make rest lowercase
    return extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
  }
  
  // Handle camelCase names like "johnDoe" - take first camelCase part
  const camelCaseParts = name.match(/^[a-z]+|[A-Z][a-z]*/g);
  if (camelCaseParts && camelCaseParts.length > 0) {
    const firstPart = camelCaseParts[0];
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
  }
  
  // Final fallback: return first word before any special character, capitalized
  const firstWord = name.split(/[^a-zA-Z]/)[0];
  if (firstWord && firstWord.length > 0) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
  
  return 'User';
};