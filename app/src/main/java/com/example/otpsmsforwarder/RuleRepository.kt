package com.example.otpsmsforwarder

import android.content.Context
import org.json.JSONArray

object RuleRepository {
    private const val PREFS_NAME = "BerelianRulesPrefs"
    private const val KEY_RULES = "rules_json"

    fun getAllRules(context: Context): List<ForwardRule> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(KEY_RULES, null) ?: return defaultInitialRules()

        return try {
            val array = JSONArray(jsonStr)
            val list = mutableListOf<ForwardRule>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(ForwardRule.fromJson(obj))
            }
            if (list.isEmpty()) defaultInitialRules() else list
        } catch (e: Exception) {
            defaultInitialRules()
        }
    }

    fun saveRule(context: Context, rule: ForwardRule) {
        val currentRules = getAllRules(context).toMutableList()
        val existingIndex = currentRules.indexOfFirst { it.id == rule.id }
        if (existingIndex >= 0) {
            currentRules[existingIndex] = rule
        } else {
            currentRules.add(0, rule)
        }
        saveAll(context, currentRules)
    }

    fun deleteRule(context: Context, ruleId: String) {
        val currentRules = getAllRules(context).filter { it.id != ruleId }
        saveAll(context, currentRules)
    }

    fun toggleRule(context: Context, ruleId: String, isEnabled: Boolean) {
        val currentRules = getAllRules(context).toMutableList()
        val index = currentRules.indexOfFirst { it.id == ruleId }
        if (index >= 0) {
            currentRules[index].isEnabled = isEnabled
            saveAll(context, currentRules)
        }
    }

    private fun saveAll(context: Context, rules: List<ForwardRule>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val array = JSONArray()
        rules.forEach { array.put(it.toJson()) }
        prefs.edit().putString(KEY_RULES, array.toString()).apply()
    }

    private fun defaultInitialRules(): List<ForwardRule> {
        return listOf(
            ForwardRule(
                title = "پروژه رمز پویا و بانک‌ها",
                isEnabled = true,
                receiveSimSlot = 0,
                sendSimSlot = 0,
                senderNumbers = listOf(),
                targetNumbers = listOf(),
                filterKeywords = listOf("رمز پویا", "کد تایید", "otp", "بانک"),
                matchAllKeywords = false
            )
        )
    }
}
