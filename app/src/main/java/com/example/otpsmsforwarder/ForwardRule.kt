package com.example.otpsmsforwarder

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class ForwardRule(
    val id: String = UUID.randomUUID().toString(),
    var title: String = "قانون بدون نام",           // نام پروژه / موضوع (مثلاً: بانک ملت، سامانه بورس، اکانت تلگرام)
    var isEnabled: Boolean = true,
    var receiveSimSlot: Int = 0,                    // 0: هر دو سیم‌کارت، 1: سیم 1، 2: سیم 2
    var sendSimSlot: Int = 0,                       // 0: سیم‌کارت پیش‌فرض، 1: سیم 1، 2: سیم 2
    var senderNumbers: List<String> = emptyList(),  // چندین شماره مبدأ / فرستنده (یا خالی برای همه)
    var targetNumbers: List<String> = emptyList(),  // چندین شماره مقصد برای ارسال پیامک
    var filterKeywords: List<String> = emptyList(), // چندین کلمه کلیدی یا شرط متنی (مثل: رمز پویا، کد ورود، خرید)
    var matchAllKeywords: Boolean = false           // false: اگر هر کدام از کلمات بود | true: همه کلمات باید باشند
) {
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("id", id)
        json.put("title", title)
        json.put("isEnabled", isEnabled)
        json.put("receiveSimSlot", receiveSimSlot)
        json.put("sendSimSlot", sendSimSlot)

        val sendersArr = JSONArray()
        senderNumbers.forEach { sendersArr.put(it) }
        json.put("senderNumbers", sendersArr)

        val targetsArr = JSONArray()
        targetNumbers.forEach { targetsArr.put(it) }
        json.put("targetNumbers", targetsArr)

        val keywordsArr = JSONArray()
        filterKeywords.forEach { keywordsArr.put(it) }
        json.put("filterKeywords", keywordsArr)

        json.put("matchAllKeywords", matchAllKeywords)
        return json
    }

    companion object {
        fun fromJson(json: JSONObject): ForwardRule {
            val id = json.optString("id", UUID.randomUUID().toString())
            val title = json.optString("title", "پروژه")
            val isEnabled = json.optBoolean("isEnabled", true)
            val receiveSimSlot = json.optInt("receiveSimSlot", 0)
            val sendSimSlot = json.optInt("sendSimSlot", 0)

            val senderList = mutableListOf<String>()
            val sendersArr = json.optJSONArray("senderNumbers")
            if (sendersArr != null) {
                for (i in 0 until sendersArr.length()) {
                    senderList.add(sendersArr.optString(i))
                }
            }

            val targetList = mutableListOf<String>()
            val targetsArr = json.optJSONArray("targetNumbers")
            if (targetsArr != null) {
                for (i in 0 until targetsArr.length()) {
                    targetList.add(targetsArr.optString(i))
                }
            }

            val keywordList = mutableListOf<String>()
            val keywordsArr = json.optJSONArray("filterKeywords")
            if (keywordsArr != null) {
                for (i in 0 until keywordsArr.length()) {
                    keywordList.add(keywordsArr.optString(i))
                }
            }

            val matchAll = json.optBoolean("matchAllKeywords", false)

            return ForwardRule(
                id = id,
                title = title,
                isEnabled = isEnabled,
                receiveSimSlot = receiveSimSlot,
                sendSimSlot = sendSimSlot,
                senderNumbers = senderList,
                targetNumbers = targetList,
                filterKeywords = keywordList,
                matchAllKeywords = matchAll
            )
        }
    }
}
