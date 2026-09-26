package com.example.otpsmsforwarder

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.*

class RuleEditDialog(
    private val context: Context,
    private val existingRule: ForwardRule?,
    private val onSaveListener: (ForwardRule) -> Unit,
    private val onDeleteListener: ((String) -> Unit)? = null
) {

    fun show() {
        val dialog = Dialog(context)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)

        val isNew = existingRule == null
        val rule = existingRule ?: ForwardRule(title = "پروژه جدید")

        val scrollView = ScrollView(context).apply {
            setBackgroundColor(Color.parseColor("#0F0B1E"))
            isFillViewport = true
        }

        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        val headerText = TextView(context).apply {
            text = if (isNew) "➕ تعریف پروژه / موضوع جدید" else "✏️ ویرایش پروژه: ${rule.title}"
            textSize = 18f
            setTextColor(Color.parseColor("#FBBF24"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }

        // ۱. عنوان موضوع / پروژه
        val titleInput = EditText(context).apply {
            hint = "نام پروژه (مثلاً: حسابداری شرکت، بانک‌ها، تایید تلگرام)"
            setText(rule.title)
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            background = inputBg()
            setPadding(20, 20, 20, 20)
        }

        // ۲. انتخاب سیم‌کارت دریافت
        val receiveSimSpinner = Spinner(context).apply {
            val options = arrayOf("هر دو سیم‌کارت (پیش‌فرض)", "فقط سیم‌کارت ۱", "فقط سیم‌کارت ۲")
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, options)
            setSelection(rule.receiveSimSlot)
            background = inputBg()
            setPadding(16, 16, 16, 16)
        }

        // ۳. انتخاب سیم‌کارت ارسال
        val sendSimSpinner = Spinner(context).apply {
            val options = arrayOf("سیم‌کارت پیش‌فرض سیستم", "ارسال از سیم‌کارت ۱", "ارسال از سیم‌کارت ۲")
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, options)
            setSelection(rule.sendSimSlot)
            background = inputBg()
            setPadding(16, 16, 16, 16)
        }

        // ۴. چندین شماره مبدأ (با کاما یا خط جدید)
        val sendersInput = EditText(context).apply {
            hint = "شماره‌های مبدأ مجاز (با کاما یا خط بعد جدا کنید)\nخالی = دریافت از همه شماره‌ها"
            setText(rule.senderNumbers.joinToString("\n"))
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            background = inputBg()
            setPadding(20, 20, 20, 20)
            minLines = 2
        }

        // ۵. چندین شماره مقصد (با کاما یا خط جدید)
        val targetsInput = EditText(context).apply {
            hint = "شماره‌های مقصد برای فوروارد پیامک (با کاما یا خط جدید)\nمثال: 09121111111، 09352222222"
            setText(rule.targetNumbers.joinToString("\n"))
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            background = inputBg()
            setPadding(20, 20, 20, 20)
            minLines = 3
        }

        // ۶. چندین متن / کلمه فیلتر
        val keywordsInput = EditText(context).apply {
            hint = "متن‌ها یا کلمات کلیدی (با کاما یا خط جدید جدا کنید)\nمثال: رمز پویا، کد ورود، واریز"
            setText(rule.filterKeywords.joinToString("\n"))
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
            background = inputBg()
            setPadding(20, 20, 20, 20)
            minLines = 3
        }

        val matchAllCheckbox = CheckBox(context).apply {
            text = "تمام کلمات باید همزمان در متن پیامک موجود باشند"
            setTextColor(Color.parseColor("#E9D5FF"))
            isChecked = rule.matchAllKeywords
        }

        val saveBtn = Button(context).apply {
            text = "ذخیره تغییرات پروژه"
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.parseColor("#F59E0B"))
            setOnClickListener {
                val title = titleInput.text.toString().trim()
                if (title.isEmpty()) {
                    Toast.makeText(context, "لطفاً نام پروژه را بنویسید", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val targets = targetsInput.text.toString()
                    .split("\n", ",", "،")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }

                if (targets.isEmpty()) {
                    Toast.makeText(context, "حداقل باید یک شماره مقصد وارد کنید", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val senders = sendersInput.text.toString()
                    .split("\n", ",", "،")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }

                val keywords = keywordsInput.text.toString()
                    .split("\n", ",", "،")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }

                rule.title = title
                rule.receiveSimSlot = receiveSimSpinner.selectedItemPosition
                rule.sendSimSlot = sendSimSpinner.selectedItemPosition
                rule.senderNumbers = senders
                rule.targetNumbers = targets
                rule.filterKeywords = keywords
                rule.matchAllKeywords = matchAllCheckbox.isChecked

                onSaveListener(rule)
                dialog.dismiss()
            }
        }

        root.addView(headerText)
        root.addView(label("نام موضوع یا پروژه:"))
        root.addView(titleInput)
        root.addView(space(16))
        root.addView(label("سیم‌کارت دریافت‌کننده پیام:"))
        root.addView(receiveSimSpinner)
        root.addView(space(16))
        root.addView(label("سیم‌کارت ارسال‌کننده پیام:"))
        root.addView(sendSimSpinner)
        root.addView(space(16))
        root.addView(label("شماره‌های مقصد (ارسال همزمان به این شماره‌ها):"))
        root.addView(targetsInput)
        root.addView(space(16))
        root.addView(label("شماره‌های مبدأ (اختیاری - چند شماره):"))
        root.addView(sendersInput)
        root.addView(space(16))
        root.addView(label("کلمات یا متن‌های شرطی پیامک (اختیاری - چند متن):"))
        root.addView(keywordsInput)
        root.addView(matchAllCheckbox)
        root.addView(space(24))
        root.addView(saveBtn)

        if (!isNew && onDeleteListener != null) {
            val deleteBtn = Button(context).apply {
                text = "حذف این پروژه"
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#EF4444"))
                setOnClickListener {
                    onDeleteListener.invoke(rule.id)
                    dialog.dismiss()
                }
            }
            root.addView(space(12))
            root.addView(deleteBtn)
        }

        scrollView.addView(root)
        dialog.setContentView(scrollView)
        dialog.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.show()
    }

    private fun label(txt: String): TextView {
        return TextView(context).apply {
            text = txt
            setTextColor(Color.parseColor("#E9D5FF"))
            textSize = 13f
            setPadding(0, 0, 0, 6)
        }
    }

    private fun space(h: Int): View {
        return View(context).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, h)
        }
    }

    private fun inputBg(): GradientDrawable {
        return GradientDrawable().apply {
            setColor(Color.parseColor("#1B1238"))
            cornerRadius = 14f
            setStroke(2, Color.parseColor("#4B5563"))
        }
    }
}
