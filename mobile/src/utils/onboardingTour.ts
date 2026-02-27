import { createTour } from '@edwardloopez/react-native-coachmark';

/**
 * Home screen tour — shown when the user has no tabs (first launch).
 * Single step: highlights the "create tab" input row.
 */
export const homeTour = createTour(
  'tabbit-home-onboarding',
  [
    {
      id: 'create-tab',
      title: 'Create a Tab',
      description:
        'Start by typing a name for your bill (like "Friday Dinner") and tap New Tab.',
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
  ],
  { showOnce: true, delay: 800 }
);

/**
 * Tab editor tour — shown the first time a user opens the tab editor.
 * Walks through scanning, adding people, and assigning items.
 */
export const editorTour = createTour(
  'tabbit-editor-onboarding',
  [
    {
      id: 'scan-receipt',
      title: 'Add Items',
      description:
        'Scan a receipt with your camera, or add items manually below.',
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'add-rabbit',
      title: 'Add People',
      description: 'Tap here to add people who are splitting the bill.',
      placement: 'bottom',
      shape: 'pill',
      padding: 4,
    },
    {
      id: 'rabbit-bar',
      title: 'Assign & Share',
      description:
        'Tap a person, then tap items to assign them. When done, adjust tax & tip and share the bill!',
      placement: 'bottom',
      shape: 'rect',
      padding: 4,
    },
  ],
  { showOnce: true, delay: 800 }
);
