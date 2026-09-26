import JSZip from 'jszip';
import { ForwardRule } from '../types/forwarder';

export interface AndroidFile {
  name: string;
  path: string;
  language: 'kotlin' | 'xml' | 'gradle' | 'markdown';
  content: string;
  description: string;
}

export function generateAndroidProjectFiles(rule: ForwardRule): AndroidFile[] {
  const packageName = 'com.example.otpsmsforwarder';
  const defaultSender = rule.senderNumber || '';
  const defaultTarget = rule.destinationNumber || '';
  const defaultFilterText = rule.customFilterText || (rule.keywords.length > 0 ? rule.keywords.join(', ') : '');
  const defaultFilterMode = rule.textFilterMode || 'contains_phrase';
  const forwardModeStr = rule.forwardMode;

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

        val targetNumber = prefs.getString("target_number", "${defaultTarget}")?.trim() ?: ""
        if (targetNumber.isEmpty()) {
            Log.w(TAG, "No destination target number configured.")
            return
        }

        val filterSender = prefs.getString("filter_sender", "${defaultSender}")?.trim() ?: ""
        val filterText = prefs.getString("filter_text", "${defaultFilterText}")?.trim() ?: ""
        val filterMode = prefs.getString("filter_mode", "${defaultFilterMode}") ?: "contains_phrase"
        val forwardMode = prefs.getString("forward_mode", "${forwardModeStr}") ?: "full_message"
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
        // اگر فیلتر متنی خالی باشد یا حالت روی any_message باشد، همه پیام‌ها تأیید می‌شوند
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

    private fun normalizeNumber(phone: String): String {
        var p = phone.replace("[\\\\s\\\\-\\\\(\\\\)]".toRegex(), "")
        if (p.startsWith("+98")) p = "0" + p.substring(3)
        if (p.startsWith("0098")) p = "0" + p.substring(4)
        if (p.startsWith("98") && p.length >= 10) p = "0" + p.substring(2)
        return p
    }

    companion object {
        private const val TAG = "SmsReceiver"
    }
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
                "سرویس هدایت پیامک",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "هدایت فعال پیامک‌ها بر اساس شرط متنی دلخواه به گیرنده دوم"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("هدایت خودکار پیامک فعال است")
            .setContentText("پیام‌های ورودی مطابق با متن دلخواه شما بلافاصله به گیرنده مقصد ارسال می‌شوند.")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "otp_forwarder_channel"
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

  const mainActivityKt = `package ${packageName}

import android.Manifest
import android.content.Context
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private val requiredPermissions = mutableListOf(
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.READ_SMS,
        Manifest.permission.SEND_SMS
    ).apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }.toTypedArray()

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            Toast.makeText(this, "مجوزهای پیامک با موفقیت صادر شد", Toast.LENGTH_SHORT).show()
            SmsForwardService.startService(this)
        } else {
            Toast.makeText(this, "برای کارکرد برنامه مجوز پیامک ضروری است", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        checkAndRequestPermissions()

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0F172A)
                ) {
                    ForwarderScreen(
                        context = this,
                        onRequestPermissions = { checkAndRequestPermissions() }
                    )
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val missingPermissions = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missingPermissions.isNotEmpty()) {
            requestPermissionLauncher.launch(missingPermissions.toTypedArray())
        } else {
            val prefs = getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE)
            if (prefs.getBoolean("is_active", true)) {
                SmsForwardService.startService(this)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForwarderScreen(context: Context, onRequestPermissions: () -> Unit) {
    val prefs = remember { context.getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE) }

    var isActive by remember { mutableStateOf(prefs.getBoolean("is_active", true)) }
    var filterSender by remember { mutableStateOf(prefs.getString("filter_sender", "${defaultSender}") ?: "") }
    var targetNumber by remember { mutableStateOf(prefs.getString("target_number", "${defaultTarget}") ?: "") }
    var filterText by remember { mutableStateOf(prefs.getString("filter_text", "${defaultFilterText}") ?: "") }
    var filterMode by remember { mutableStateOf(prefs.getString("filter_mode", "${defaultFilterMode}") ?: "contains_phrase") }
    var forwardMode by remember { mutableStateOf(prefs.getString("forward_mode", "${forwardModeStr}") ?: "full_message") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "هدایتگر خودکار پیامک بر اساس متن دلخواه",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            text = "دریافت پیامک از فرستنده و ارسال خودکار پیام‌های دلخواه به گیرنده مقصد",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        // وضعیت سرویس
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("وضعیت سرویس", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Text(
                        if (isActive) "در حال اجرا و گوش به زنگ" else "غیرفعال",
                        color = if (isActive) Color(0xFF4ADE80) else Color(0xFFF87171),
                        fontSize = 12.sp
                    )
                }
                Switch(
                    checked = isActive,
                    onCheckedChange = { checked ->
                        isActive = checked
                        prefs.edit().putBoolean("is_active", checked).apply()
                        if (checked) {
                            SmsForwardService.startService(context)
                        } else {
                            SmsForwardService.stopService(context)
                        }
                    }
                )
            }
        }

        // ۱. شماره فرستنده مبدأ
        OutlinedTextField(
            value = filterSender,
            onValueChange = {
                filterSender = it
                prefs.edit().putString("filter_sender", it).apply()
            },
            label = { Text("۱. شماره یا نام فرستنده مبدأ (خالی = همه)") },
            placeholder = { Text("مثلاً 982000400 یا بانک یا خالی") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // ۲. شماره گیرنده مقصد
        OutlinedTextField(
            value = targetNumber,
            onValueChange = {
                targetNumber = it
                prefs.edit().putString("target_number", it).apply()
            },
            label = { Text("۲. شماره گیرنده مقصد (ارسال پیامک به این خط)") },
            placeholder = { Text("09121234567") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // ۳. متن شرطی دلخواه کاربر (نه لزوماً OPT)
        OutlinedTextField(
            value = filterText,
            onValueChange = {
                filterText = it
                prefs.edit().putString("filter_text", it).apply()
            },
            label = { Text("۳. متن یا عبارت شرطی دلخواه شما") },
            placeholder = { Text("مثلاً: واریز، تایید، خرید، یا هر متن دلخواه (خالی = همه پیام‌ها)") },
            modifier = Modifier.fillMaxWidth()
        )

        // دکمه‌های انتخاب حالت فیلتر متن
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("نوع تطابق متن دلخواه:", fontSize = 12.sp, color = Color(0xFFCBD5E1))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = filterMode == "contains_phrase",
                    onClick = {
                        filterMode = "contains_phrase"
                        prefs.edit().putString("filter_mode", "contains_phrase").apply()
                    },
                    label = { Text("شامل متن") }
                )
                FilterChip(
                    selected = filterMode == "starts_with",
                    onClick = {
                        filterMode = "starts_with"
                        prefs.edit().putString("filter_mode", "starts_with").apply()
                    },
                    label = { Text("شروع با متن") }
                )
                FilterChip(
                    selected = filterMode == "any_message",
                    onClick = {
                        filterMode = "any_message"
                        prefs.edit().putString("filter_mode", "any_message").apply()
                    },
                    label = { Text("همه پیام‌ها (بدون شرط)") }
                )
            }
        }

        // دکمه ذخیره تنظیمات
        Button(
            onClick = {
                prefs.edit()
                    .putBoolean("is_active", isActive)
                    .putString("filter_sender", filterSender)
                    .putString("target_number", targetNumber)
                    .putString("filter_text", filterText)
                    .putString("filter_mode", filterMode)
                    .putString("forward_mode", forwardMode)
                    .apply()
                Toast.makeText(context, "تنظیمات دلخواه ذخیره شد", Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("ذخیره تنظیمات")
        }

        // دکمه بررسی مجوزها
        OutlinedButton(
            onClick = onRequestPermissions,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("بررسی و درخواست مجوزهای پیامک")
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
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
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
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
`;

  const settingsGradle = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
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

  const gitignoreContent = `*.iml
.gradle
/local.properties
/.idea/caches
/.idea/libraries
/.idea/modules.xml
/.idea/workspace.xml
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
app/build/
`;

  const githubWorkflowYml = `name: Build Berelian Peyk Debug APK

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'

    - name: Setup Gradle
      uses: gradle/actions/setup-gradle@v3

    - name: Grant Execute Permission for Gradlew
      run: |
        if [ -f "./gradlew" ]; then
          chmod +x ./gradlew
        fi

    - name: Build Debug APK (No Keystore Required)
      run: |
        if [ -f "./gradlew" ]; then
          ./gradlew assembleDebug --stacktrace
        else
          gradle assembleDebug --stacktrace
        fi

    - name: Upload Debug APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: Berelian-Peyk-Debug-APK
        path: app/build/outputs/apk/debug/*.apk
        retention-days: 30
`;

  const readmeMd = `# برلیان پیک (Berelian Peyk) - هدایت خودکار پیامک
عضو خانواده نرم‌افزارهای برلیان (برلیان پیمان · برلیان پلن · برلیان پیک)

این پروژه برای ساخت نسخه اندروید برلیان پیک بر اساس فیلترهای متن دلخواه شما طراحی شده است:
- فرستنده مبدأ: ${defaultSender || 'تمامی فرستنده‌ها'}
- گیرنده مقصد: ${defaultTarget || 'شماره تلفن مورد نظر شما'}
- شرط متنی دلخواه: ${defaultFilterText || 'بدون شرط (ارسال همه پیام‌های فرستنده)'}
- حالت تطابق: ${defaultFilterMode}

## نحوه بیلد خودکار در GitHub (بدون نیاز به Keystore):
این پروژه شامل فایل آماده \`.github/workflows/build-debug-apk.yml\` است.
کافیست پروژه را به یک مخزن (Repository) در گیت‌هاب Push کنید. گیت‌هاب به صورت خودکار نسخه Debug APK را می‌سازد و فایل نصبی \`app-debug.apk\` را در تب Actions در اختیار شما می‌گذارد.
`;

  return [
    {
      name: 'build-debug-apk.yml',
      path: '.github/workflows/build-debug-apk.yml',
      language: 'gradle',
      content: githubWorkflowYml,
      description: 'دستور خودکار GitHub Actions برای ساخت APK دیباگ بدون نیاز به Keystore',
    },
    {
      name: '.gitignore',
      path: '.gitignore',
      language: 'markdown',
      content: gitignoreContent,
      description: 'فایل نادیده‌گیری فایل‌های موقت گرادل و بیلد قبل از پوش به گیت‌هاب',
    },
    {
      name: 'AndroidManifest.xml',
      path: 'app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: manifestXml,
      description: 'فایل مانیفست با مجوزهای پیامک و سرویس پیش‌زمینه پایدار برلیان پیک',
    },
    {
      name: 'SmsReceiver.kt',
      path: `app/src/main/java/com/example/otpsmsforwarder/SmsReceiver.kt`,
      language: 'kotlin',
      content: smsReceiverKt,
      description: 'کلاس دریافت پیامک لحظه‌ای و فیلتر بر اساس متن دلخواه شما',
    },
    {
      name: 'MainActivity.kt',
      path: `app/src/main/java/com/example/otpsmsforwarder/MainActivity.kt`,
      language: 'kotlin',
      content: mainActivityKt,
      description: 'رابط کاربری Jetpack Compose با قابلیت تعریف متن دلخواه، شروط و شماره‌ها',
    },
    {
      name: 'SmsForwardService.kt',
      path: `app/src/main/java/com/example/otpsmsforwarder/SmsForwardService.kt`,
      language: 'kotlin',
      content: smsForwardServiceKt,
      description: 'سرویس پیش‌زمینه فعال برای جلوگیری از توقف توسط سیستم مدیریت باتری',
    },
    {
      name: 'ForwardHistoryManager.kt',
      path: `app/src/main/java/com/example/otpsmsforwarder/ForwardHistoryManager.kt`,
      language: 'kotlin',
      content: forwardHistoryKt,
      description: 'مدیریت و ذخیره‌سازی لاگ پیامک‌های هدایت‌شده',
    },
    {
      name: 'BootReceiver.kt',
      path: `app/src/main/java/com/example/otpsmsforwarder/BootReceiver.kt`,
      language: 'kotlin',
      content: bootReceiverKt,
      description: 'راه‌اندازی مجدد خودکار سرویس بعد از روشن شدن گوشی',
    },
    {
      name: 'build.gradle.kts (app)',
      path: 'app/build.gradle.kts',
      language: 'gradle',
      content: buildGradleApp,
      description: 'فایل وابستگی‌ها و تنظیمات کامپایل ماژول اپلیکیشن',
    },
    {
      name: 'settings.gradle.kts',
      path: 'settings.gradle.kts',
      language: 'gradle',
      content: settingsGradle,
      description: 'تنظیمات نام پروژه و مخازن ماون و گوگل',
    },
    {
      name: 'README.md',
      path: 'README.md',
      language: 'markdown',
      content: readmeMd,
      description: 'راهنمای فارسی و نحوه بیلد دیباگ در گیت‌هاب',
    },
  ];
}

// Generate ZIP file and trigger browser download
export async function downloadAndroidProjectZip(rule: ForwardRule): Promise<void> {
  const zip = new JSZip();
  const files = generateAndroidProjectFiles(rule);

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Berelian_Peyk_Android_Project.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
