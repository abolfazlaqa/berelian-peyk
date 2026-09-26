package com.example.otpsmsforwarder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.telephony.SubscriptionManager
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val PERMISSION_REQUEST_CODE = 101
    private lateinit var rulesContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkPermissions()

        val scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0717"))
            isFillViewport = true
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(36, 48, 36, 48)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        // هدر برنامه
        val title = TextView(this).apply {
            text = "برلیان پیک"
            textSize = 28f
            setTextColor(Color.parseColor("#FBBF24"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 6)
        }

        val subtitle = TextView(this).apply {
            text = "سامانه مدیریت پروژه‌های هدایت هوشمند پیامک"
            textSize = 13f
            setTextColor(Color.parseColor("#C4B5FD"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }

        // کارت اطلاعات سیم‌کارت‌های فعال گوشی
        val simInfoCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 20, 24, 20)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1A1038"))
                cornerRadius = 20f
                setStroke(2, Color.parseColor("#6D28D9"))
            }
        }
        val simTitle = TextView(this).apply {
            text = "📱 سیم‌کارت‌های فعال در گوشی:"
            setTextColor(Color.parseColor("#FDE68A"))
            textSize = 13f
            setPadding(0, 0, 0, 6)
        }
        val simDesc = TextView(this).apply {
            text = getDetectedSimsInfo()
            setTextColor(Color.WHITE)
            textSize = 12f
            setLineSpacing(4f, 1f)
        }
        simInfoCard.addView(simTitle)
        simInfoCard.addView(simDesc)

        // دکمه بزرگ ایجاد پروژه / موضوع جدید
        val addProjectBtn = Button(this).apply {
            text = "➕ افزودن پروژه یا موضوع جدید"
            setTextColor(Color.BLACK)
            textSize = 15f
            setBackgroundColor(Color.parseColor("#F59E0B"))
            setPadding(24, 20, 24, 20)
            setOnClickListener {
                RuleEditDialog(
                    context = this@MainActivity,
                    existingRule = null,
                    onSaveListener = { newRule ->
                        RuleRepository.saveRule(this@MainActivity, newRule)
                        refreshRulesList()
                        Toast.makeText(this@MainActivity, "پروژه '${newRule.title}' با موفقیت ساخته شد", Toast.LENGTH_SHORT).show()
                    }
                ).show()
            }
        }

        val listTitle = TextView(this).apply {
            text = "📋 لیست پروژه‌ها و قوانین شما:"
            setTextColor(Color.parseColor("#E9D5FF"))
            textSize = 16f
            setPadding(0, 28, 0, 12)
            gravity = Gravity.RIGHT
        }

        // لیست داینامیک پروژه‌ها
        rulesContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(simInfoCard)
        layout.addView(space(20))
        layout.addView(addProjectBtn)
        layout.addView(listTitle)
        layout.addView(rulesContainer)

        scrollView.addView(layout)
        setContentView(scrollView)

        refreshRulesList()
    }

    private fun refreshRulesList() {
        rulesContainer.removeAllViews()
        val rules = RuleRepository.getAllRules(this)

        if (rules.isEmpty()) {
            val emptyTv = TextView(this).apply {
                text = "هنوز پروژه‌ای ثبت نشده است.\nبرای شروع روی دکمه «افزودن پروژه جدید» بزنید."
                setTextColor(Color.GRAY)
                textSize = 13f
                gravity = Gravity.CENTER
                setPadding(0, 32, 0, 32)
            }
            rulesContainer.addView(emptyTv)
            return
        }

        for (rule in rules) {
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(28, 24, 28, 24)
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#150D2E"))
                    cornerRadius = 24f
                    setStroke(2, if (rule.isEnabled) Color.parseColor("#4C1D95") else Color.parseColor("#374151"))
                }
            }

            // سطر هدر پروژه: عنوان و سوئیچ فعال/غیرفعال
            val headerRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            val projectTitleTv = TextView(this).apply {
                text = rule.title
                textSize = 16f
                setTextColor(if (rule.isEnabled) Color.parseColor("#FBBF24") else Color.GRAY)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val switchBtn = Switch(this).apply {
                isChecked = rule.isEnabled
                setOnCheckedChangeListener { _, isChecked ->
                    RuleRepository.toggleRule(this@MainActivity, rule.id, isChecked)
                    refreshRulesList()
                }
            }

            headerRow.addView(projectTitleTv)
            headerRow.addView(switchBtn)

            // جزئیات سیم‌کارت‌ها و شماره‌ها
            val detailsTv = TextView(this).apply {
                val targetsText = if (rule.targetNumbers.isNotEmpty()) rule.targetNumbers.joinToString(", ") else "تعریف نشده!"
                val sendersText = if (rule.senderNumbers.isNotEmpty()) rule.senderNumbers.joinToString(", ") else "تمام فرستنده‌ها"
                val keywordsText = if (rule.filterKeywords.isNotEmpty()) rule.filterKeywords.joinToString(" ، ") else "تمام پیامک‌ها"

                text = "• مقاصد (${rule.targetNumbers.size} خط): $targetsText\n" +
                       "• مبادی: $sendersText\n" +
                       "• فیلتر متن: $keywordsText\n" +
                       "• سیم دریافت: ${simSlotName(rule.receiveSimSlot)} | سیم ارسال: ${simSlotName(rule.sendSimSlot)}"
                textSize = 12f
                setTextColor(Color.parseColor("#DDD6FE"))
                setLineSpacing(4f, 1f)
                setPadding(0, 12, 0, 16)
            }

            val editBtn = Button(this).apply {
                text = "⚙️ ویرایش پروژه و شماره‌ها"
                setTextColor(Color.WHITE)
                textSize = 12f
                setBackgroundColor(Color.parseColor("#4338CA"))
                setOnClickListener {
                    RuleEditDialog(
                        context = this@MainActivity,
                        existingRule = rule,
                        onSaveListener = { updatedRule ->
                            RuleRepository.saveRule(this@MainActivity, updatedRule)
                            refreshRulesList()
                            Toast.makeText(this@MainActivity, "پروژه به‌روزرسانی شد", Toast.LENGTH_SHORT).show()
                        },
                        onDeleteListener = { ruleId ->
                            RuleRepository.deleteRule(this@MainActivity, ruleId)
                            refreshRulesList()
                            Toast.makeText(this@MainActivity, "پروژه حذف گردید", Toast.LENGTH_SHORT).show()
                        }
                    ).show()
                }
            }

            card.addView(headerRow)
            card.addView(detailsTv)
            card.addView(editBtn)

            rulesContainer.addView(card)
            rulesContainer.addView(space(18))
        }
    }

    private fun simSlotName(slot: Int): String {
        return when (slot) {
            1 -> "سیم ۱"
            2 -> "سیم ۲"
            else -> "پیش‌فرض"
        }
    }

    private fun getDetectedSimsInfo(): String {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return "دسترسی به سیم‌کارت‌ها هنوز داده نشده است."
        }

        return try {
            val subManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val list = subManager?.activeSubscriptionInfoList
            if (list.isNullOrEmpty()) {
                "هیچ سیم‌کارت فعالی در دستگاه یافت نشد."
            } else {
                val sb = StringBuilder()
                for (info in list) {
                    val slot = info.simSlotIndex + 1
                    val carrier = info.displayName ?: info.carrierName ?: "اپراتور نامشخص"
                    sb.append("• سیم‌کارت $slot: $carrier\n")
                }
                sb.toString().trim()
            }
        } catch (e: Exception) {
            "وضعیت سیم‌کارت‌ها آماده است."
        }
    }

    private fun space(h: Int): View {
        return View(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h)
        }
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.SEND_SMS,
            Manifest.permission.READ_PHONE_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            recreate()
        }
    }
}
