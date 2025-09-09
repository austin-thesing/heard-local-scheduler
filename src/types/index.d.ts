/**
 * Type definitions for the Heard Local Scheduler
 */

/**
 * Scheduler configuration interface
 */
export interface SchedulerConfig {
  sole_prop: SchedulerTypeConfig;
  s_corp: SchedulerTypeConfig;
  default?: SchedulerTypeConfig;
}

/**
 * Individual scheduler type configuration
 */
export interface SchedulerTypeConfig {
  url: string;
  name: string;
  description: string;
}

/**
 * Field mapping configuration
 */
export interface FieldMappings {
  [key: string]: string[];
  email: string[];
  firstName: string[];
  lastName: string[];
  company: string[];
  phone: string[];
}

/**
 * Form data interface
 */
export interface FormData {
  [key: string]: string | undefined;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  firstname?: string;
  first_name?: string;
  lastname?: string;
  last_name?: string;
}

/**
 * Router options interface
 */
export interface RouterOptions {
  redirect?: boolean;
  debug?: boolean;
}

/**
 * Scheduler options interface
 */
export interface SchedulerOptions {
  debug?: boolean;
}

/**
 * Stored data interface
 */
export interface StoredData {
  formData: FormData;
  schedulerType?: string;
  source: 'localStorage' | 'sessionStorage' | 'cookies';
}

/**
 * Router data for storage
 */
export interface RouterData {
  scheduler_type: string;
  formData: FormData;
  timestamp: number;
  source: string;
}

/**
 * Analytics event data
 */
export interface AnalyticsEventData {
  scheduler_type: string;
  has_email?: boolean;
  has_name?: boolean;
  method?: string;
  source?: string;
}

/**
 * HubSpot message payload interface
 */
export interface HubSpotMessagePayload {
  type?: string;
  messageType?: string;
  eventName?: string;
  data?: any;
  formGuid?: string;
  accepted?: boolean;
}

/**
 * Logger interface
 */
export interface Logger {
  log(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Form monitor interface
 */
export interface FormMonitor {
  init(): void;
  getCapturedData(): FormData;
  destroy(): void;
}

/**
 * HubSpot router interface
 */
export interface HubSpotRouter {
  init(): void;
  handleFormSubmission(submissionData: any): void;
  destroy(): void;
}

/**
 * Webflow scheduler interface
 */
export interface WebflowScheduler {
  init(): void;
  handleScheduler(): void;
  fireLeadEvents(): void;
}

/**
 * Debug API interface
 */
export interface HubSpotRouterDebug {
  config: SchedulerConfig;
  determineSchedulerType: (data: FormData) => string;
  buildSchedulerUrl: (type: string, data: FormData) => string;
  handleFormSubmission: (data: any) => void;
  getCapturedData: () => FormData;
  router: HubSpotRouter;
}

/**
 * Webflow scheduler debug API interface
 */
export interface WebflowSchedulerDebug {
  getStoredFormData: () => StoredData | null;
  getQueryParams: () => { [key: string]: string };
  buildSchedulerUrl: (data: FormData) => string;
  handleScheduler: () => void;
  fireLeadEvents: () => void;
  init: () => void;
  config: SchedulerConfig;
}

/**
 * Global window interface extensions
 */
declare global {
  interface Window {
    HubSpotRouter?: {
      init?: (options?: RouterOptions) => void;
      handleFormSubmission?: (data: any) => void;
      determineSchedulerType?: (data: FormData) => string;
      buildSchedulerUrl?: (type: string, data: FormData) => string;
      config?: SchedulerConfig;
      DEBUG?: boolean;
    };
    HubSpotRouterDebug?: HubSpotRouterDebug;
    WebflowSchedulerComplete?: WebflowSchedulerDebug;
    _capturedFormData?: FormData;

    // Analytics globals
    fbq?: any;
    rdt?: any;
    gtag?: any;
    ga?: any;
    posthog?: any;
    amplitude?: any;
  }
}

export {};
