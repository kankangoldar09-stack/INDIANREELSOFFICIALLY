export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
}

export * from './types';
