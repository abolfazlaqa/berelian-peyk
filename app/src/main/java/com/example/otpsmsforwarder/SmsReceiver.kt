package com.example.otpsmsforwarder

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.core.content.ContextCompat

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

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
        val incomingSubId = intent.getIntExtra("subscription", -1)
        val incomingSlotIndex = getSlotIndexFromSubId(context, incomingSubId)

        Log.i(TAG, "پیامک دریافت شد از: $senderNumber روی سیم‌کارت: ${if (incomingSlotIndex >= 0) incomingSlotIndex + 1 else "نامشخص"}")

        // دریافت تمام پروژه‌ها / موضوعات تعریف‌شده در برنامه
        val allRules = RuleRepository.getAllRules(context)

        for (rule in allRules) {
            if (!rule.isEnabled) continue
            if (rule.targetNumbers.isEmpty()) continue

            // ۱. بررسی تطابق سیم‌کارت دریافت‌کننده
            if (rule.receiveSimSlot > 0 && incomingSlotIndex != -1) {
                val expectedSlot = rule.receiveSimSlot - 1
                if (incomingSlotIndex != expectedSlot) {
                    continue
                }
            }

            // ۲. بررسی شرط چندین شماره مبدأ (در صورت تعریف شدن)
            if (rule.senderNumbers.isNotEmpty()) {
                val normIncomingSender = normalizePhoneNumber(senderNumber)
                val matchesAnySender = rule.senderNumbers.any { definedSender ->
                    val normDefined = normalizePhoneNumber(definedSender)
                    normIncomingSender.contains(normDefined) || senderNumber.contains(definedSender)
                }
                if (!matchesAnySender) {
                    continue
                }
            }

            // ۳. بررسی شرط چندین کلمه / متن پیامک (در صورت تعریف شدن)
            if (rule.filterKeywords.isNotEmpty()) {
                val lowerBody = fullBody.lowercase()
                val keywordMatched = if (rule.matchAllKeywords) {
                    rule.filterKeywords.all { lowerBody.contains(it.trim().lowercase()) }
                } else {
                    rule.filterKeywords.any { lowerBody.contains(it.trim().lowercase()) }
                }

                if (!keywordMatched) {
                    continue
                }
            }

            // ۴. ارسال پیامک به چندین شماره مقصد تعریف‌شده در این پروژه
            Log.i(TAG, "شرایط پروژه '${rule.title}' برقرار شد. ارسال به ${rule.targetNumbers.size} شماره مقصد...")
            for (destNumber in rule.targetNumbers) {
                val cleanDest = destNumber.trim()
                if (cleanDest.isNotEmpty()) {
                    sendSmsWithSim(context, cleanDest, fullBody, rule.sendSimSlot)
                }
            }
        }
    }

    private fun normalizePhoneNumber(num: String): String {
        return num.replace("+98", "0").replace("[^0-9]".toRegex(), "")
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
            Log.i(TAG, "پیامک با موفقیت به $destination ارسال شد.")
        } catch (e: Exception) {
            Log.e(TAG, "خطا در ارسال پیامک به $destination", e)
        }
    }

    companion object {
        private const val TAG = "BerelianPeyk"
    }
}
