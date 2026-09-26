package com.example.otpsmsforwarder

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.content.ContextCompat

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE)
        val isServiceActive = prefs.getBoolean("is_active", true)
        if (!isServiceActive) {
            Log.d(TAG, "سرویس غیرفعال است.")
            return
        }

        val targetNumber = prefs.getString("target_number", "")?.trim() ?: ""
        if (targetNumber.isEmpty()) {
            Log.w(TAG, "شماره مقصد تنظیم نشده است.")
            return
        }

        // فیلتر سیم‌کارت دریافت‌کننده (0: هر سیم‌کارتی، 1: سیم 1، 2: سیم 2)
        val filterSimSlot = prefs.getInt("filter_sim_slot", 0)

        // تشخیص اینکه پیامک روی کدام سیم‌کارت وارد شده است
        val incomingSubId = intent.getIntExtra("subscription", -1)
        val incomingSlotIndex = getSlotIndexFromSubId(context, incomingSubId)

        if (filterSimSlot > 0 && incomingSlotIndex != -1) {
            val expectedSlotIndex = filterSimSlot - 1 // 1 -> slot 0, 2 -> slot 1
            if (incomingSlotIndex != expectedSlotIndex) {
                Log.d(TAG, "پیامک روی سیم‌کارت ${incomingSlotIndex + 1} دریافت شد اما فیلتر روی سیم‌کارت $filterSimSlot تنظیم است.")
                return
            }
        }

        val filterSender = prefs.getString("filter_sender", "")?.trim() ?: ""
        val filterText = prefs.getString("filter_text", "")?.trim() ?: ""

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
        Log.i(TAG, "پیامک دریافت شد از: $senderNumber روی سیم‌کارت: ${if (incomingSlotIndex >= 0) incomingSlotIndex + 1 else "نامشخص"} با متن: $fullBody")

        // 1. بررسی شرط فرستنده (در صورت پر بودن)
        if (filterSender.isNotEmpty()) {
            val normSender = senderNumber.replace("+98", "0").replace("[^0-9]".toRegex(), "")
            val normFilter = filterSender.replace("+98", "0").replace("[^0-9]".toRegex(), "")
            if (!normSender.contains(normFilter) && !senderNumber.contains(filterSender)) {
                Log.d(TAG, "فرستنده با شرط مطابقت ندارد.")
                return
            }
        }

        // 2. بررسی شرط متن پیامک (در صورت پر بودن)
        if (filterText.isNotEmpty()) {
            if (!fullBody.lowercase().contains(filterText.lowercase())) {
                Log.d(TAG, "متن پیامک با شرط مطابقت ندارد.")
                return
            }
        }

        // سیم‌کارت انتخابی برای ارسال پیامک (0: پیش‌فرض، 1: سیم 1، 2: سیم 2)
        val sendSimSlot = prefs.getInt("send_sim_slot", 0)
        val outgoingMessage = fullBody

        // ارسال پیامک با در نظر گرفتن سیم‌کارت مورد نظر
        sendSmsWithSim(context, targetNumber, outgoingMessage, sendSimSlot)
    }

    private fun getSlotIndexFromSubId(context: Context, subId: Int): Int {
        if (subId == -1) return -1
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return -1
        }
        return try {
            val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val subInfo = subManager?.getActiveSubscriptionInfo(subId)
            subInfo?.simSlotIndex ?: -1
        } catch (e: Exception) {
            -1
        }
    }

    private fun sendSmsWithSim(context: Context, destination: String, text: String, simSlot: Int) {
        try {
            var targetSubId: Int? = null

            if (simSlot > 0 && ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                val subManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                val list = subManager?.activeSubscriptionInfoList
                val expectedSlot = simSlot - 1
                val matchedInfo = list?.firstOrNull { it.simSlotIndex == expectedSlot }
                if (matchedInfo != null) {
                    targetSubId = matchedInfo.subscriptionId
                }
            }

            val smsManager: SmsManager = if (targetSubId != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java).createForSubscriptionId(targetSubId)
                } else {
                    @Suppress("DEPRECATION")
                    SmsManager.getSmsManagerForSubscriptionId(targetSubId)
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    SmsManager.getDefault()
                }
            }

            val parts = smsManager.divideMessage(text)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(destination, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(destination, null, text, null, null)
            }
            Log.i(TAG, "پیامک با موفقیت از سیم‌کارت انتخابی به $destination ارسال شد.")
        } catch (e: Exception) {
            Log.e(TAG, "خطا در ارسال پیامک", e)
        }
    }

    companion object {
        private const val TAG = "BerelianPeyk"
    }
}
