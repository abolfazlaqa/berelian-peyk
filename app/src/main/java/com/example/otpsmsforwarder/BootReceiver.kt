package com.example.otpsmsforwarder

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
}