export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  venmo_username: string | null;
  cashapp_cashtag: string | null;
  paypal_username: string | null;
  created_at: string;
}

export interface Tab {
  id: string;
  name: string;
  owner_id: string;
  tax_percent: number;
  tip_percent: number;
  receipt_image_url: string | null;
  created_at: string;
  share_token: string;
  updated_at: string;
  items?: Item[];
  rabbits?: Rabbit[];
}

export interface Item {
  id: string;
  tab_id: string;
  description: string;
  price_cents: number;
  created_at: string;
  rabbits?: Rabbit[];
}

export interface Rabbit {
  id: string;
  tab_id: string;
  profile_id: string | null;
  name: string;
  color: RabbitColor;
  created_at: string;
  profile?: Profile;
}

export interface ItemRabbit {
  item_id: string;
  rabbit_id: string;
}

export type RabbitColor =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'primary'
  | 'secondary';

export const RABBIT_COLORS: RabbitColor[] = [
  'success',
  'info',
  'warning',
  'danger',
  'primary',
  'secondary',
];

export interface SavedRabbit {
  id: string;
  name: string;
  color: RabbitColor;
  venmo_username: string | null;
  cashapp_cashtag: string | null;
  paypal_username: string | null;
}

export const COLOR_HEX: Record<RabbitColor, string> = {
  success: '#d1e7dd',
  info: '#cff4fc',
  warning: '#fff3cd',
  danger: '#f8d7da',
  primary: '#cfe2ff',
  secondary: '#e2e3e5',
};
