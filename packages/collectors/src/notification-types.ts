export interface AndroidNotificationPayload {
  package_name: string;
  app_name: string | null;
  title: string;
  body: string;
  posted_time: string;
  notification_key: string;
}
