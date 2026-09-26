package com.example.otpsmsforwarder

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
}