# Android Notification Listener Service

Kotlin Android app that captures payment notifications and sends them to the AI-Powered Personal Budget server.

## Project Structure

```
apps/android-listener/
├── README.md
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts
    └── src/
        └── main/
            ├── AndroidManifest.xml
            └── java/com/aibudget/listener/
                ├── PaymentNotificationListener.kt
                ├── WebhookSender.kt
                └── NotificationFilter.kt
```

## build.gradle.kts (root)

```kotlin
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
}
```

## app/build.gradle.kts

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.aibudget.listener"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.aibudget.listener"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "WEBHOOK_URL", "\"${project.findProperty("WEBHOOK_URL")}\"")
        buildConfigField("String", "WEBHOOK_SECRET", "\"${project.findProperty("WEBHOOK_SECRET")}\"")
    }
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")
}
```

## AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application>
        <service
            android:name=".PaymentNotificationListener"
            android:exported="true"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>
    </application>

</manifest>
```

## PaymentNotificationListener.kt

```kotlin
package com.aibudget.listener

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.google.gson.Gson
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class PaymentNotificationListener : NotificationListenerService() {

    private val sender = WebhookSender()
    private val filter = NotificationFilter()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName
        if (!filter.isPaymentApp(packageName)) return

        val extras = sbn.notification.extras
        val payload = mapOf(
            "package_name" to packageName,
            "app_name" to filter.getAppName(packageName),
            "title" to (extras.getString("android.title") ?: ""),
            "body" to (extras.getString("android.text") ?: ""),
            "posted_time" to Instant.ofEpochMilli(sbn.postTime)
                .atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            "notification_key" to sbn.key,
        )

        val json = Gson().toJson(payload)
        sender.post(json)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
    }
}
```

## WebhookSender.kt

```kotlin
package com.aibudget.listener

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class WebhookSender {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    fun post(json: String) {
        val body = json.toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(BuildConfig.WEBHOOK_URL)
            .header("Authorization", "Bearer ${BuildConfig.WEBHOOK_SECRET}")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                android.util.Log.e("WebhookSender", "Failed: ${response.code}")
            }
        }
    }
}
```

## NotificationFilter.kt

```kotlin
package com.aibudget.listener

class NotificationFilter {

    private val paymentApps = mapOf(
        "jp.ne.paypay.android.app" to "PayPay",
        "com.kakaopay" to "KakaoPay",
        // Add more apps here
    )

    fun isPaymentApp(packageName: String): Boolean {
        return paymentApps.containsKey(packageName)
    }

    fun getAppName(packageName: String): String {
        return paymentApps[packageName] ?: packageName
    }
}
```

## Build & Deploy

```bash
# Set webhook URL and secret
export WEBHOOK_URL="https://your-server.com/api/android-webhook"
export WEBHOOK_SECRET="your-webhook-secret"

# Build
./gradlew assembleDebug

# The APK is at app/build/outputs/apk/debug/app-debug.apk
# Install on device and grant Notification Access in Settings
```

## Notes

- This is a skeleton — the Kotlin files above should be created in the actual Android project
- The user must manually enable Notification Access in Settings after installing
- Battery optimization may kill the service; add a persistent notification to keep it alive
- Test with PayPay app notifications first
