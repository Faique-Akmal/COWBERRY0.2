// isko isliye banae hai kiu ke hame App.jsx me navigation use karna tha for FloatingChatButton aur navigation ka pura code AppNavigator me hai aur navigation sirf AppNavigator ke child me chalega kiu ke navigation ko jha define karte hai wo uske child me hi apply hota hai but hame App.jsx me use karna hai navigation aur App.jsx jo hai wo AppNavigator ka parent hai to yha navigation apply nhi hota isliye hame ye RootNavigation.js banana pada


import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    // optional: fallback logging or queueing
    console.warn('Navigation not ready yet. Could not navigate to', name);
  }
}
