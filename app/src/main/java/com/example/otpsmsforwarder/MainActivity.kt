package com.example.otpsmsforwarder

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val PERMISSION_REQUEST_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        checkPermissions()

        val prefs = getSharedPreferences("ForwarderSettings", Context.MODE_PRIVATE)

        val scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0717"))
            isFillViewport = true
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 50, 40, 50)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        val title = TextView(this).apply {
            text = "برلیان پیک"
            textSize = 26f
            setTextColor(Color.parseColor("#FBBF24"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 8)
        }

        val subtitle = TextView(this).apply {
            text = "مدیریت و هدایت خودکار پیامک (پشتیبانی کامل از ۲ سیم‌کارت)"
            textSize = 13f
            setTextColor(Color.parseColor("#C4B5FD"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        // کارت وضعیت سیم‌کارت‌های فعال در گوشی
        val simInfoCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 24, 28, 24)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1E113D"))
                cornerRadius = 20f
                setStroke(2, Color.parseColor("#6D28D9"))
            }
        }

        val simCardTitle = TextView(this).apply {
            text = "📱 سیم‌کارت‌های شناسایی شده در گوشی شما:"
            setTextColor(Color.parseColor("#FDE68A"))
            textSize = 14f
            setPadding(0, 0, 0, 8)
        }
        val simCardsDetail = TextView(this).apply {
            text = getDetectedSimsInfo()
            setTextColor(Color.WHITE)
            textSize = 12f
            setLineSpacing(6f, 1f)
        }
        simInfoCard.addView(simCardTitle)
        simInfoCard.addView(simCardsDetail)

        // کارت تنظیمات
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#160D2E"))
                cornerRadius = 28f
                setStroke(2, Color.parseColor("#4C1D95"))
            }
        }

        val statusSwitch = Switch(this).apply {
            val active = prefs.getBoolean("is_active", true)
            text = if (active) "وضعیت سرویس: فعال و آماده کار" else "وضعیت سرویس: متوقف"
            setTextColor(if (active) Color.parseColor("#34D399") else Color.parseColor("#F87171"))
            isChecked = active
            setOnCheckedChangeListener { _, isChecked ->
                text = if (isChecked) "وضعیت سرویس: فعال و آماده کار" else "وضعیت سرویس: متوقف"
                setTextColor(if (isChecked) Color.parseColor("#34D399") else Color.parseColor("#F87171"))
            }
        }

        // انتخاب سیم‌کارت دریافت‌کننده پیامک
        val receiveSimSpinner = Spinner(this).apply {
            val simOptions = arrayOf("هر دو سیم‌کارت (پیش‌فرض)", "فقط سیم‌کارت ۱", "فقط سیم‌کارت ۲")
            val adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, simOptions)
            this.adapter = adapter
            setSelection(prefs.getInt("filter_sim_slot", 0))
            background = inputBg()
            setPadding(16, 16, 16, 16)
        }

        // انتخاب سیم‌کارت ارسال‌کننده پیامک
        val sendSimSpinner = Spinner(this).apply {
            val simOptions = arrayOf("سیم‌کارت پیش‌فرض سیستم", "ارسال از سیم‌کارت ۱", "ارسال از سیم‌کارت ۲")
            val adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, simOptions)
            this.adapter = adapter
            setSelection(prefs.getInt("send_sim_slot", 0))
            background = inputBg()
            setPadding(16, 16, 16, 16)
        }

        val targetInput = EditText(this).apply {
            hint = "شماره مقصد پیامک (مثال: 09121234567)"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            setText(prefs.getString("target_number", ""))
            setPadding(20, 20, 20, 20)
            background = inputBg()
        }

        val filterSenderInput = EditText(this).apply {
            hint = "شماره فرستنده مبدأ (اختیاری - مثل بانک یا شماره خاص)"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            setText(prefs.getString("filter_sender", ""))
            setPadding(20, 20, 20, 20)
            background = inputBg()
        }

        val filterTextInput = EditText(this).apply {
            hint = "کلمه یا شرط در متن پیامک (اختیاری)"
            setHintTextColor(Color.GRAY)
            setTextColor(Color.WHITE)
            setText(prefs.getString("filter_text", ""))
            setPadding(20, 20, 20, 20)
            background = inputBg()
        }

        val saveButton = Button(this).apply {
            text = "ذخیره و فعال‌سازی برلیان پیک"
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.parseColor("#F59E0B"))
            setOnClickListener {
                val target = targetInput.text.toString().trim()
                if (target.isEmpty()) {
                    Toast.makeText(this@MainActivity, "لطفاً شماره مقصد را مشخص کنید", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                prefs.edit()
                    .putBoolean("is_active", statusSwitch.isChecked)
                    .putInt("filter_sim_slot", receiveSimSpinner.selectedItemPosition)
                    .putInt("send_sim_slot", sendSimSpinner.selectedItemPosition)
                    .putString("target_number", target)
                    .putString("filter_sender", filterSenderInput.text.toString().trim())
                    .putString("filter_text", filterTextInput.text.toString().trim())
                    .apply()

                Toast.makeText(this@MainActivity, "تنظیمات با موفقیت ذخیره شد. سرویس فعال است!", Toast.LENGTH_LONG).show()
            }
        }

        card.addView(statusSwitch)
        card.addView(space(20))
        card.addView(label("کدام سیم‌کارت پیامک‌ها را دریافت و فیلتر کند؟"))
        card.addView(receiveSimSpinner)
        card.addView(space(18))
        card.addView(label("ارسال به مقصد از طریق کدام سیم‌کارت انجام شود؟"))
        card.addView(sendSimSpinner)
        card.addView(space(18))
        card.addView(label("شماره مقصد (پیامک به این شماره فوروارد شود):"))
        card.addView(targetInput)
        card.addView(space(18))
        card.addView(label("فیلتر شماره مبدأ (اختیاری):"))
        card.addView(filterSenderInput)
        card.addView(space(18))
        card.addView(label("فیلتر متن پیامک (اختیاری):"))
        card.addView(filterTextInput)
        card.addView(space(28))
        card.addView(saveButton)

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(simInfoCard)
        layout.addView(space(20))
        layout.addView(card)
        scrollView.addView(layout)

        setContentView(scrollView)
    }

    private fun getDetectedSimsInfo(): String {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return "مجوز دسترسی به سیم‌کارت‌ها هنوز داده نشده است.\nلطفاً در پیام اول باز شدن برنامه روی «اجازه دادن (Allow)» بزنید."
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
                    val number = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        try {
                            subManager.getPhoneNumber(info.subscriptionId)
                        } catch (e: Exception) {
                            info.number ?: ""
                        }
                    } else {
                        info.number ?: ""
                    }
                    val numText = if (!number.isNullOrEmpty()) " - شماره: $number" else ""
                    sb.append("• سیم‌کارت $slot: $carrier $numText\n")
                }
                sb.toString().trim()
            }
        } catch (e: Exception) {
            "خطا در خواندن اطلاعات سیم‌کارت‌ها: ${e.message}"
        }
    }

    private fun label(txt: String): TextView {
        return TextView(this).apply {
            text = txt
            setTextColor(Color.parseColor("#E9D5FF"))
            textSize = 13f
            setPadding(0, 0, 0, 6)
        }
    }

    private fun space(h: Int): View {
        return View(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h)
        }
    }

    private fun inputBg(): GradientDrawable {
        return GradientDrawable().apply {
            setColor(Color.parseColor("#0B0717"))
            cornerRadius = 14f
            setStroke(2, Color.parseColor("#374151"))
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
            // بازآفرینی اکتیویتی تا اطلاعات سیم‌کارت‌ها فورا در صفحه آپدیت شود
            recreate()
        }
    }
}
