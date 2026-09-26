import fs from 'fs';
import path from 'path';

const packageName = 'com.example.otpsmsforwarder';
const packagePath = packageName.replace(/\./g, '/');

const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${packageName}">

    <!-- مجوزهای اساسی برای خواندن و ارسال پیامک -->
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    
    <!-- مجوز اجرای پس‌زمینه و نوتیفیکیشن برای اندروید 13 و بالاتر -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="برلیان پیک"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.OtpSmsForwarder">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.OtpSmsForwarder">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- دریافت‌کننده پیامک هنگام ورود SMS -->
        <receiver
            android:name=".SmsReceiver"
            android:enabled="true"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <!-- سرویس پایدار پیش‌زمینه جهت جلوگیری از بسته شدن توسط مدیریت باتری -->
        <service
            android:name=".SmsForwardService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Automated SMS forwarding utility based on custom filter" />
        </service>

        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`;

const smsReceiverKt = `package ${packageName}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import android.util.Log
import java.util.regex.Pattern

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE)
        val isServiceActive = prefs.getBoolean("is_active", true)
        if (!isServiceActive) {
            Log.d(TAG, "SmsForwarder is disabled in settings.")
            return
        }

        val targetNumber = prefs.getString("target_number", "")?.trim() ?: ""
        if (targetNumber.isEmpty()) {
            Log.w(TAG, "No destination target number configured.")
            return
        }

        val filterSender = prefs.getString("filter_sender", "")?.trim() ?: ""
        val filterText = prefs.getString("filter_text", "")?.trim() ?: ""
        val filterMode = prefs.getString("filter_mode", "contains_phrase") ?: "contains_phrase"
        val forwardMode = prefs.getString("forward_mode", "full_message") ?: "full_message"
        val customTemplate = prefs.getString("custom_template", "متن دریافت شده:\\n{BODY}") ?: ""

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val fullBodyBuilder = StringBuilder()
        var senderNumber = ""

        for (sms in messages) {
            if (senderNumber.isEmpty()) {
                senderNumber = sms.displayOriginatingAddress ?: sms.originatingAddress ?: ""
            }
            fullBodyBuilder.append(sms.displayMessageBody ?: sms.messageBody ?: "")
        }

        val fullBody = fullBodyBuilder.toString()
        Log.i(TAG, "Incoming SMS from: $senderNumber, body: $fullBody")

        // 1. بررسی تطابق فرستنده (در صورت پر بودن فیلتر شماره مبدأ)
        if (filterSender.isNotEmpty()) {
            val normSender = normalizeNumber(senderNumber)
            val normFilter = normalizeNumber(filterSender)
            if (!normSender.contains(normFilter) && !senderNumber.contains(filterSender)) {
                Log.d(TAG, "Sender $senderNumber does not match rule $filterSender")
                return
            }
        }

        // 2. بررسی شرط متن دلخواه کاربر (Custom Text Match)
        val textMatched = isTextMatched(fullBody, filterText, filterMode)
        if (!textMatched) {
            Log.d(TAG, "SMS body does not match user custom text filter: '$filterText' with mode: $filterMode")
            return
        }

        // استخراج کد در صورت نیاز (اگر در متن کد باشد)
        val extractedOtp = extractOtpCode(fullBody)

        // آماده‌سازی پیام خروجی برای گیرنده دوم
        val outgoingText = when (forwardMode) {
            "otp_only" -> extractedOtp ?: fullBody
            "custom_template" -> customTemplate
                .replace("{OTP}", extractedOtp ?: "---")
                .replace("{CODE}", extractedOtp ?: "---")
                .replace("{SENDER}", senderNumber)
                .replace("{BODY}", fullBody)
            else -> fullBody // "full_message"
        }

        // ارسال پیامک خودکار به شماره گیرنده
        sendSms(context, targetNumber, outgoingText)

        // ثبت در گزارش محلی برنامه
        ForwardHistoryManager.addLog(context, senderNumber, targetNumber, fullBody, outgoingText, true)
    }

    private fun isTextMatched(body: String, filterText: String, mode: String): Boolean {
        if (mode == "any_message" || filterText.isEmpty()) {
            return true
        }

        val lowerBody = body.lowercase()
        val lowerFilter = filterText.lowercase()

        return when (mode) {
            "starts_with" -> lowerBody.trim().startsWith(lowerFilter)
            "regex" -> try {
                Pattern.compile(filterText, Pattern.CASE_INSENSITIVE).matcher(body).find()
            } catch (e: Exception) {
                lowerBody.contains(lowerFilter)
            }
            "contains_any" -> {
                val items = filterText.split(",", "،", "\\n").map { it.trim().lowercase() }.filter { it.isNotEmpty() }
                items.any { lowerBody.contains(it) }
            }
            else -> { // "contains_phrase"
                lowerBody.contains(lowerFilter)
            }
        }
    }

    private fun extractOtpCode(body: String): String? {
        val normalized = normalizeDigits(body)
        
        val patterns = listOf(
            Pattern.compile("(?:کد|رمز|otp|opt|code|pin)[^\\\\d]{0,15}?(\\\\d{4,8})", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(\\\\d{4,8})[^\\\\d]{0,10}?(?:کد|رمز|otp|opt)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:\\\\D|^)(\\\\d{4,8})(?:\\\\D|$)")
        )

        for (pattern in patterns) {
            val matcher = pattern.matcher(normalized)
            if (matcher.find()) {
                val group = if (matcher.groupCount() >= 1) matcher.group(1) else matcher.group(0)
                if (!group.isNullOrEmpty()) return group.trim()
            }
        }
        return null
    }

    private fun sendSms(context: Context, destination: String, text: String) {
        try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            val parts = smsManager.divideMessage(text)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(destination, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(destination, null, text, null, null)
            }
            Log.i(TAG, "Successfully forwarded SMS to: $destination")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS to $destination", e)
        }
    }

    private fun normalizeDigits(input: String): String {
        var str = input
        val persian = arrayOf("۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹")
        val arabic = arrayOf("٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩")
        for (i in 0..9) {
            str = str.replace(persian[i], i.toString())
            str = str.replace(arabic[i], i.toString())
        }
        return str
    }

    private fun normalizeNumber(num: String): String {
        return normalizeDigits(num).replace("+98", "0").replace("[^0-9]".toRegex(), "")
    }

    companion object {
        private const val TAG = "SmsReceiver"
    }
}`;

const mainActivityKt = `package ${packageName}

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.RECEIVE_SMS] == true &&
                         permissions[Manifest.permission.SEND_SMS] == true
        if (smsGranted) {
            Toast.makeText(this, "مجوزهای پیامک با موفقیت تأیید شد", Toast.LENGTH_SHORT).show()
            SmsForwardService.startService(this)
        } else {
            Toast.makeText(this, "برای کارکرد برنامه، نیاز به تأیید مجوز پیامک است", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkAndRequestPermissions()

        setContent {
            BerelianPeykTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0B0717)
                ) {
                    MainScreen()
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.SEND_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            requestPermissionLauncher.launch(missing.toTypedArray())
        } else {
            SmsForwardService.startService(this)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE) }

    var targetNumber by remember { mutableStateOf(prefs.getString("target_number", "") ?: "") }
    var filterSender by remember { mutableStateOf(prefs.getString("filter_sender", "") ?: "") }
    var filterText by remember { mutableStateOf(prefs.getString("filter_text", "") ?: "") }
    var isActive by remember { mutableStateOf(prefs.getBoolean("is_active", true)) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "برلیان پیک",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFFBBF24)
        )
        Text(
            text = "هدایت هوشمند و خودکار پیامک بر اساس شرط دلخواه",
            fontSize = 12.sp,
            color = Color(0xFFC4B5FD),
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF160D2E))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isActive) "سرویس فعال است" else "سرویس متوقف است",
                        color = if (isActive) Color(0xFF34D399) else Color(0xFFF87171),
                        fontWeight = FontWeight.Bold
                    )
                    Switch(
                        checked = isActive,
                        onCheckedChange = { checked ->
                            isActive = checked
                            prefs.edit().putBoolean("is_active", checked).apply()
                            if (checked) SmsForwardService.startService(context)
                            else SmsForwardService.stopService(context)
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = targetNumber,
                    onValueChange = { targetNumber = it },
                    label = { Text("شماره گیرنده مقصد (اجباری)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = filterSender,
                    onValueChange = { filterSender = it },
                    label = { Text("شماره فرستنده مبدأ (اختیاری)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = filterText,
                    onValueChange = { filterText = it },
                    label = { Text("متن شرط دلخواه شما") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        prefs.edit()
                            .putString("target_number", targetNumber.trim())
                            .putString("filter_sender", filterSender.trim())
                            .putString("filter_text", filterText.trim())
                            .putBoolean("is_active", isActive)
                            .apply()
                        Toast.makeText(context, "تنظیمات برلیان پیک با موفقیت ذخیره شد", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
                ) {
                    Text("ذخیره تنظیمات", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun BerelianPeykTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFFF59E0B),
            background = Color(0xFF0B0717),
            surface = Color(0xFF160D2E)
        ),
        content = content
    )
}`;

const smsForwardServiceKt = `package ${packageName}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SmsForwardService : Service() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildForegroundNotification()
        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "برلیان پیک - سرویس پس‌زمینه",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "سرویس فعال برای هدایت پیامک‌های دریافتی"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("برلیان پیک فعال است")
            .setContentText("پایش و هدایت خودکار پیامک‌ها در حال اجراست")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "BerelianPeykServiceChannel"
        const val NOTIFICATION_ID = 1001

        fun startService(context: Context) {
            val intent = Intent(context, SmsForwardService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, SmsForwardService::class.java)
            context.stopService(intent)
        }
    }
}`;

const forwardHistoryKt = `package ${packageName}

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ForwardHistoryManager {

    private const val PREFS_NAME = "ForwardHistoryPrefs"
    private const val KEY_HISTORY = "history_logs"

    fun addLog(
        context: Context,
        sender: String,
        target: String,
        body: String,
        forwardedText: String,
        success: Boolean
    ) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentJson = prefs.getString(KEY_HISTORY, "[]") ?: "[]"
            val array = JSONArray(currentJson)

            val item = JSONObject().apply {
                put("timestamp", SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date()))
                put("sender", sender)
                put("target", target)
                put("body", body)
                put("forwarded", forwardedText)
                put("success", success)
            }

            val newArray = JSONArray()
            newArray.put(item)
            for (i in 0 until Math.min(array.length(), 49)) {
                newArray.put(array.get(i))
            }

            prefs.edit().putString(KEY_HISTORY, newArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}`;

const bootReceiverKt = `package ${packageName}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = context.getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE)
            val isActive = prefs.getBoolean("is_active", true)
            if (isActive) {
                SmsForwardService.startService(context)
            }
        }
    }
}`;

const buildGradleApp = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.05.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
}
`;

const rootBuildGradle = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    id("com.android.application") version "8.3.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.23" apply false
}
`;

const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "BerelianPeyk"
include(":app")
`;

const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`;

const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">برلیان پیک</string>
</resources>
`;

const themesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.OtpSmsForwarder" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">#0B0717</item>
    </style>
</resources>
`;

const githubWorkflow = `name: Build Berelian Peyk Debug APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'

    - name: Setup Gradle
      uses: gradle/actions/setup-gradle@v3

    - name: Grant Execute Permission
      run: |
        if [ -f "./gradlew" ]; then
          chmod +x ./gradlew
        fi

    - name: Build Debug APK
      run: |
        if [ -f "./gradlew" ]; then
          ./gradlew assembleDebug --stacktrace
        else
          gradle assembleDebug --stacktrace
        fi

    - name: Upload Debug APK
      uses: actions/upload-artifact@v4
      with:
        name: Berelian-Peyk-Debug-APK
        path: app/build/outputs/apk/debug/*.apk
        retention-days: 30
`;

const files = [
  { path: 'app/src/main/AndroidManifest.xml', content: manifestXml },
  { path: `app/src/main/java/${packagePath}/MainActivity.kt`, content: mainActivityKt },
  { path: `app/src/main/java/${packagePath}/SmsReceiver.kt`, content: smsReceiverKt },
  { path: `app/src/main/java/${packagePath}/SmsForwardService.kt`, content: smsForwardServiceKt },
  { path: `app/src/main/java/${packagePath}/ForwardHistoryManager.kt`, content: forwardHistoryKt },
  { path: `app/src/main/java/${packagePath}/BootReceiver.kt`, content: bootReceiverKt },
  { path: 'app/src/main/res/values/strings.xml', content: stringsXml },
  { path: 'app/src/main/res/values/themes.xml', content: themesXml },
  { path: 'app/build.gradle.kts', content: buildGradleApp },
  { path: 'build.gradle.kts', content: rootBuildGradle },
  { path: 'settings.gradle.kts', content: settingsGradle },
  { path: 'gradle.properties', content: gradleProperties },
  { path: '.github/workflows/build-debug-apk.yml', content: githubWorkflow }
];

console.log('Writing Android files...');
for (const file of files) {
  const dir = path.dirname(file.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file.path, file.content, 'utf8');
  console.log(`Created: ${file.path}`);
}
console.log('All Android project files created successfully!');
