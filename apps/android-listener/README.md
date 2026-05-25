# Android Notification Listener

Planned Android app that captures payment notifications and sends them to the AI-Powered Personal Budget ingestion pipeline.

## Architecture

```
Android Phone
  └── NotificationListenerService (system service)
        │
        │ Captures notifications from:
        │   - PayPay (jp.ne.paypay.android.app)
        │   - Korean payment apps (TBD)
        │   - Mobile banking apps (TBD)
        │
        │ Sends via HTTPS POST to:
        ▼
  Server webhook endpoint
        │
        ▼
  RawEvent storage → extraction → validation → Actual Budget
```

## NotificationListenerService

Android's `NotificationListenerService` is a system-level service that can read all notifications posted on the device. The user must explicitly grant notification access permission in Settings.

### Required Permissions

- `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
- `android.permission.INTERNET` (to send HTTP requests)
- `android.permission.POST_NOTIFICATIONS` (Android 13+)

### Service Manifest Entry

```xml
<service
    android:name=".PaymentNotificationListener"
    android:exported="true"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

### Key Methods

- `onNotificationPosted(StatusBarNotification sbn)` — called when a notification is posted
- `onNotificationRemoved(StatusBarNotification sbn)` — called when removed (optional to track)

### Captured Fields Per Notification

| Field | Source | Example |
|-------|--------|---------|
| `package_name` | `sbn.packageName` | `jp.ne.paypay.android.app` |
| `app_name` | Resolved from PackageManager | `PayPay` |
| `title` | `sbn.notification.extras.getString(EXTRA_TITLE)` | `PayPay` |
| `body` | `sbn.notification.extras.getString(EXTRA_TEXT)` | `ファミリーマートで680円を支払いました` |
| `posted_time` | `sbn.postTime` (epoch millis → ISO 8601) | `2026-05-24T20:15:00+09:00` |
| `notification_key` | `sbn.key` | `0|jp.ne.paypay.android.app|1|null|1000` |
| `notification_id` | `sbn.id` | `1000` |
| `tag` | `sbn.tag` | `null` |
| `category` | `sbn.notification.category` | `Money` |

### Filtering

Only forward notifications matching payment-related apps:
- Filter by `packageName` against a configured allowlist
- Optionally filter by `notification.category == Notification.CATEGORY_MONEY`
- Ignore ongoing/group summary notifications

## Webhook Payload

The Android app sends a POST request with the following JSON body:

```json
{
  "package_name": "jp.ne.paypay.android.app",
  "app_name": "PayPay",
  "title": "PayPay",
  "body": "\u30d5\u30a1\u30df\u30ea\u30fc\u30de\u30fc\u30c8\u3067680\u5186\u3092\u652f\u6255\u3044\u307e\u3057\u305f",
  "posted_time": "2026-05-24T20:15:00+09:00",
  "notification_key": "0|jp.ne.paypay.android.app|1|null|1000"
}
```

### Authentication

The webhook endpoint is protected by `ANDROID_WEBHOOK_SECRET`. The Android app sends it as a header:

```
Authorization: Bearer <ANDROID_WEBHOOK_SECRET>
X-Webhook-Secret: <ANDROID_WEBHOOK_SECRET>
```

## Server-Side Handler (packages/collectors)

The `notificationToRawEvent()` function in `packages/collectors` converts the webhook payload into a `RawEvent`:

| Payload Field | RawEvent Field |
|--------------|----------------|
| `package_name` | `sender_or_app` |
| `app_name` | `source_name` |
| `title` | `title` |
| `body` | `body` (preserved verbatim) |
| `posted_time` | `received_at` |
| `notification_key` | `external_source_id` |
| `notification_key` hash | `raw_event_id` |
| — | `source_channel = "phone_notification"` |

## Implementation Phases

1. **Skeleton (current)** — README, payload schema, parser function, tests
2. **Android app** — Kotlin project with NotificationListenerService, OkHttp for HTTP, filter by allowlist
3. **Webhook endpoint** — HTTP endpoint in the API app that validates the secret and stores the RawEvent
4. **Production hardening** — retry logic, offline queue, battery optimization handling

## Risks

- **Battery optimization**: Android may kill the service; needs foreground service with persistent notification
- **Notification access**: User must manually enable in Settings; UX friction
- **Reboot persistence**: Service must restart after device reboot
- **Rate limiting**: High-frequency notifications may need debouncing
- **Privacy**: The service can read ALL notifications; must filter tightly to payment apps only
- **API changes**: Notification extras vary by app version; parsing may break

## Alternatives

If `NotificationListenerService` is too invasive:
- **SMS parsing**: Japanese/Korean payment notifications via SMS (more reliable, less permission friction)
- **Email-only**: Skip Android notifications, rely on email ingestion
- **Manual input**: Accept manual entry as fallback
