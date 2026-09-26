package com.example.otpsmsforwarder

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.*

class RuleEditDialog(
    private val context: Context,
    private val existingRule: ForwardRule?,
    private val onPickContactRequested: ((EditText) -> Unit),
    private val onSaveListener: (ForwardRule) -> Unit
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
            text = if (isNew) "➕ تعریف پروژه یا موضوع جدید" else "✏️ ویرایش پروژه: ${rule.title}"
            textSize = 18f
            setTextColor(Color.parseColor("#FBBF24"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }

        // ۱. عنوان موضوع / پروژه
        val titleInput = EditText(context).apply {
            hint = "نام موضوع یا پروژه (مثلاً: بانک ملت، سامانه فروش)"
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

        // ۴. بخش شماره‌های مقصد با کیبورد عددی + دکمه مخاطبین 👤 + دکمه حذف ✕
        val targetsContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        val targetEditList = mutableListOf<EditText>()

        fun addTargetRow(initialNumber: String = "") {
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 6, 0, 6)
            }
            val numInput = EditText(context).apply {
                hint = "شماره مقصد دستی یا انتخابی"
                inputType = InputType.TYPE_CLASS_PHONE
                setTextColor(Color.WHITE)
                setHintTextColor(Color.GRAY)
                setText(initialNumber)
                background = inputBg()
                setPadding(20, 16, 20, 16)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            targetEditList.add(numInput)

            // دکمه انتخاب از مخاطبین
            val contactBtn = Button(context).apply {
                text = "👤 مخاطبین"
                textSize = 12f
                setTextColor(Color.parseColor("#FDE68A"))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#311A54"))
                    cornerRadius = 12f
                    setStroke(1, Color.parseColor("#F59E0B"))
                }
                setPadding(16, 12, 16, 12)
                setOnClickListener {
                    onPickContactRequested(numInput)
                }
            }

            // دکمه حذف ردیف
            val removeBtn = Button(context).apply {
                text = "✕"
                setTextColor(Color.parseColor("#EF4444"))
                textSize = 16f
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#27153B"))
                    cornerRadius = 12f
                }
                setPadding(16, 12, 16, 12)
                setOnClickListener {
                    targetsContainer.removeView(row)
                    targetEditList.remove(numInput)
                }
            }

            row.addView(numInput)
            row.addView(spaceH(8))
            row.addView(contactBtn)
            row.addView(spaceH(8))
            row.addView(removeBtn)
            targetsContainer.addView(row)
        }

        if (rule.targetNumbers.isNotEmpty()) {
            rule.targetNumbers.forEach { addTargetRow(it) }
        } else {
            addTargetRow()
        }

        val addTargetBtn = Button(context).apply {
            text = "➕ افزودن شماره مقصد دیگر"
            setTextColor(Color.parseColor("#FBBF24"))
            textSize = 13f
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1E113D"))
                cornerRadius = 12f
                setStroke(2, Color.parseColor("#6D28D9"))
            }
            setOnClickListener { addTargetRow() }
        }

        // ۵. بخش شماره‌های مبدأ با کیبورد عددی + دکمه مخاطبین 👤 + دکمه حذف ✕
        val sendersContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        val senderEditList = mutableListOf<EditText>()

        fun addSenderRow(initialNumber: String = "") {
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 6, 0, 6)
            }
            val numInput = EditText(context).apply {
                hint = "شماره مبدأ یا فرستنده خاص"
                inputType = InputType.TYPE_CLASS_PHONE
                setTextColor(Color.WHITE)
                setHintTextColor(Color.GRAY)
                setText(initialNumber)
                background = inputBg()
                setPadding(20, 16, 20, 16)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            senderEditList.add(numInput)

            // دکمه انتخاب از مخاطبین
            val contactBtn = Button(context).apply {
                text = "👤 مخاطبین"
                textSize = 12f
                setTextColor(Color.parseColor("#DDD6FE"))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#27153B"))
                    cornerRadius = 12f
                    setStroke(1, Color.parseColor("#8B5CF6"))
                }
                setPadding(16, 12, 16, 12)
                setOnClickListener {
                    onPickContactRequested(numInput)
                }
            }

            // دکمه حذف ردیف
            val removeBtn = Button(context).apply {
                text = "✕"
                setTextColor(Color.parseColor("#EF4444"))
                textSize = 16f
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#27153B"))
                    cornerRadius = 12f
                }
                setPadding(16, 12, 16, 12)
                setOnClickListener {
                    sendersContainer.removeView(row)
                    senderEditList.remove(numInput)
                }
            }

            row.addView(numInput)
            row.addView(spaceH(8))
            row.addView(contactBtn)
            row.addView(spaceH(8))
            row.addView(removeBtn)
            sendersContainer.addView(row)
        }

        if (rule.senderNumbers.isNotEmpty()) {
            rule.senderNumbers.forEach { addSenderRow(it) }
        }

        val addSenderBtn = Button(context).apply {
            text = "➕ افزودن شماره مبدأ اختصاصی"
            setTextColor(Color.parseColor("#C4B5FD"))
            textSize = 13f
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1E113D"))
                cornerRadius = 12f
                setStroke(2, Color.parseColor("#4C1D95"))
            }
            setOnClickListener { addSenderRow() }
        }

        // ۶. کلمات کلیدی و شرط متن پیامک
        val keywordsContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
        }
        val keywordEditList = mutableListOf<EditText>()

        fun addKeywordRow(initialKeyword: String = "") {
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 6, 0, 6)
            }
            val kwInput = EditText(context).apply {
                hint = "کلمه یا عبارت شرطی (مثال: رمز پویا)"
                setTextColor(Color.WHITE)
                setHintTextColor(Color.GRAY)
                setText(initialKeyword)
                background = inputBg()
                setPadding(20, 16, 20, 16)
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
            keywordEditList.add(kwInput)

            val removeBtn = Button(context).apply {
                text = "✕"
                setTextColor(Color.parseColor("#EF4444"))
                textSize = 16f
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#27153B"))
                    cornerRadius = 12f
                }
                setPadding(16, 12, 16, 12)
                setOnClickListener {
                    keywordsContainer.removeView(row)
                    keywordEditList.remove(kwInput)
                }
            }

            row.addView(kwInput)
            row.addView(spaceH(8))
            row.addView(removeBtn)
            keywordsContainer.addView(row)
        }

        if (rule.filterKeywords.isNotEmpty()) {
            rule.filterKeywords.forEach { addKeywordRow(it) }
        }

        val addKeywordBtn = Button(context).apply {
            text = "➕ افزودن کلمه یا شرط متن"
            setTextColor(Color.parseColor("#C4B5FD"))
            textSize = 13f
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1E113D"))
                cornerRadius = 12f
                setStroke(2, Color.parseColor("#4C1D95"))
            }
            setOnClickListener { addKeywordRow() }
        }

        val matchAllCheckbox = CheckBox(context).apply {
            text = "تمام کلمات باید همزمان در متن پیامک باشند"
            setTextColor(Color.parseColor("#E9D5FF"))
            isChecked = rule.matchAllKeywords
        }

        // دکمه ذخیره نهایی
        val saveBtn = Button(context).apply {
            text = "ذخیره تغییرات پروژه"
            setTextColor(Color.BLACK)
            textSize = 15f
            setBackgroundColor(Color.parseColor("#F59E0B"))
            setOnClickListener {
                val title = titleInput.text.toString().trim()
                if (title.isEmpty()) {
                    Toast.makeText(context, "لطفاً نام پروژه را بنویسید", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val targets = targetEditList.map { it.text.toString().trim() }.filter { it.isNotEmpty() }
                if (targets.isEmpty()) {
                    Toast.makeText(context, "حداقل باید یک شماره مقصد معتبر وارد کنید", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val senders = senderEditList.map { it.text.toString().trim() }.filter { it.isNotEmpty() }
                val keywords = keywordEditList.map { it.text.toString().trim() }.filter { it.isNotEmpty() }

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
        root.addView(label("📌 نام موضوع یا پروژه:"))
        root.addView(titleInput)
        root.addView(space(16))

        root.addView(label("📥 سیم‌کارت دریافت‌کننده پیام:"))
        root.addView(receiveSimSpinner)
        root.addView(space(16))

        root.addView(label("📤 سیم‌کارت ارسال‌کننده پیام:"))
        root.addView(sendSimSpinner)
        root.addView(space(20))

        root.addView(label("🎯 شماره‌های مقصد (دستی یا انتخاب از مخاطبین):"))
        root.addView(targetsContainer)
        root.addView(space(6))
        root.addView(addTargetBtn)
        root.addView(space(20))

        root.addView(label("📞 شماره‌های مبدأ (اختیاری - دستی یا از مخاطبین):"))
        root.addView(sendersContainer)
        root.addView(space(6))
        root.addView(addSenderBtn)
        root.addView(space(20))

        root.addView(label("💬 فیلتر کلمات یا متن پیامک (اختیاری):"))
        root.addView(keywordsContainer)
        root.addView(space(6))
        root.addView(addKeywordBtn)
        root.addView(matchAllCheckbox)
        root.addView(space(24))

        root.addView(saveBtn)

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

    private fun spaceH(w: Int): View {
        return View(context).apply {
            layoutParams = LinearLayout.LayoutParams(w, LinearLayout.LayoutParams.MATCH_PARENT)
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
