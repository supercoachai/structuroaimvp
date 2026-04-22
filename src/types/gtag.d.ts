export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    /**
     * GA4 gtag: o.a. ('js', Date), ('config', id), ('event', naam, params).
     */
    gtag?: (
      command: string,
      actionOrTarget: string | Date,
      params?: Record<string, string | number | boolean>
    ) => void;
  }
}
