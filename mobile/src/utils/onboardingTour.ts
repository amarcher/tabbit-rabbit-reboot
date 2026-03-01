import { createTour } from '@edwardloopez/react-native-coachmark';
import i18n from '../i18n/i18n';

/**
 * Home screen tour — shown when the user has no tabs (first launch).
 * Single step: highlights the "create tab" input row.
 */
export const homeTour = createTour(
  'tabbit-home-onboarding',
  [
    {
      id: 'create-tab',
      title: i18n.t('tour.createTabTitle'),
      description: i18n.t('tour.createTabDesc'),
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
      title: i18n.t('tour.addItemsTitle'),
      description: i18n.t('tour.addItemsDesc'),
      placement: 'bottom',
      shape: 'rect',
      padding: 8,
    },
    {
      id: 'add-rabbit',
      title: i18n.t('tour.addPeopleTitle'),
      description: i18n.t('tour.addPeopleDesc'),
      placement: 'bottom',
      shape: 'pill',
      padding: 4,
    },
    {
      id: 'rabbit-bar',
      title: i18n.t('tour.assignShareTitle'),
      description: i18n.t('tour.assignShareDesc'),
      placement: 'bottom',
      shape: 'rect',
      padding: 4,
    },
  ],
  { showOnce: true, delay: 800 }
);
