# 🚀 Question Bank Quick Start Guide

## For Faculty: Creating Practice Tasks

### Step 1: Navigate to Tasks & Assignments
Go to **Faculty Dashboard** → **Tasks & Assignments**

### Step 2: Create New Task
Fill in the basic details:
- **Title**: e.g., "HTML Quiz - Day 5"
- **Day**: Select day number
- **Due Date**: Set deadline
- **Max Score**: e.g., 100
- **Skill Filter**: ⚠️ **REQUIRED** - Select skill (e.g., "HTML/CSS")

### Step 3: Select Task Type
**NEW FEATURE**: Choose task type
- **Regular Task**: Traditional file/link submission
- **Practice Question**: Auto-graded MCQ or Manual-graded Coding

### Step 4: Choose Question Type (for Practice Tasks)
If you selected "Practice Question":
- **MCQ**: Multiple choice questions (auto-graded instantly)
- **Coding**: Code writing tasks (requires manual grading)

### Step 5: Publish
Click **Publish Assignment**
- Backend automatically assigns random questions to students
- Students immediately see the task in their Tasks list

---

## For Students: Taking Practice Tests

### MCQ Tasks:
1. Go to **Tasks & Assignments**
2. Look for tasks with blue **MCQ** badge
3. Click on the task
4. Answer all questions
5. Submit (or wait for timer to auto-submit)
6. **See results instantly** with explanations

### Coding Tasks:
1. Go to **Tasks & Assignments**
2. Look for tasks with yellow **CODING** badge
3. Click on the task
4. Write code in the Monaco editor
5. Test your code
6. Submit solution
7. Wait for faculty grading
8. Check feedback later

---

## For Faculty: Grading Coding Submissions

### Option 1: From Navigation (Coming Soon)
Navigate to **Question Bank** → **Pending Submissions**

### Option 2: Direct URL
Go to: `https://your-domain/faculty/question-bank/pending`

### Grading Process:
1. See list of all pending coding submissions
2. Click **Grade** on any submission
3. Review student's code
4. Assign score (0-100)
5. Provide feedback
6. Submit grade
7. If score < 50%, student gets new question automatically

---

## Visual Guide

### Faculty Task Creation:
```
┌─────────────────────────────────────┐
│ Create Assignment                   │
├─────────────────────────────────────┤
│ Title: ________________________     │
│ Day: [5]   Due Date: [mm/dd/yyyy]  │
│ Max Score: [100]                    │
│                                     │
│ Task Type:                          │
│  ┌──────────┐  ┌──────────────┐   │
│  │ Regular  │  │ Practice ✓   │   │
│  └──────────┘  └──────────────┘   │
│                                     │
│ Question Type:                      │
│  ┌──────┐  ┌──────────┐           │
│  │ MCQ ✓│  │ Coding   │           │
│  └──────┘  └──────────┘           │
│                                     │
│ Skill Filter: [HTML/CSS ▼]         │
│                                     │
│  [Publish Assignment]               │
└─────────────────────────────────────┘
```

### Student Task View:
```
┌────────────────────────────────────┐
│ Day 5 - HTML Quiz          [MCQ]   │  ← Blue badge
│ Frontend Development               │
│ Status: Pending                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Day 6 - Code Challenge   [CODING]  │  ← Yellow badge
│ Frontend Development               │
│ Status: Pending                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Day 7 - Project Submission         │  ← No badge (regular)
│ Frontend Development               │
│ Status: Pending                    │
└────────────────────────────────────┘
```

---

## 💡 Pro Tips

### For Faculty:
1. **Skill Filter is Required**: Practice tasks must have a skill filter
2. **Questions Auto-Assigned**: Each student gets a random question
3. **Check Question Bank**: Ensure questions exist for the skill before creating tasks
4. **MCQs are Instant**: No grading needed - students see results immediately
5. **Coding Needs Review**: Set aside time to grade coding submissions

### For Students:
1. **MCQ Time Limit**: Pay attention to the timer
2. **No Second Chances**: MCQs are one-time (unless score < 50%)
3. **Coding Best Practices**: Write clean, commented code
4. **Test Before Submit**: Use test cases to verify your code
5. **Read Feedback**: Faculty feedback helps you improve

---

## 🔍 Where to Find Things

### Student:
- **Practice Tasks**: Tasks & Assignments page (with MCQ/CODING badges)
- **MCQ Test**: Click on MCQ task card
- **Coding Editor**: Click on Coding task card
- **Submission History**: After completing a practice task

### Faculty:
- **Create Practice Task**: Tasks & Assignments → Create Assignment
- **Pending Submissions**: /faculty/question-bank/pending
- **Grade Coding**: /faculty/question-bank/grade/:submissionId
- **Task Analytics**: (Coming soon)

---

## ⚠️ Common Issues

### "No questions assigned to me"
- Question Bank might not have questions for that skill
- Contact faculty or admin to add questions

### "MCQ test not loading"
- Check internet connection
- Refresh the page
- Clear browser cache

### "Code editor not showing"
- Ensure Monaco Editor is installed
- Check browser console for errors
- Try a different browser

### "Can't create practice task"
- Ensure skill filter is selected
- Verify questions exist for that skill
- Check if you have faculty permissions

---

## 📞 Need Help?

1. **Documentation**: Check `QUESTION_BANK_INTEGRATION_COMPLETE.md`
2. **API Reference**: See `QUESTION_BANK_PHASE_4_COMPLETE.md`
3. **Technical Details**: Review `QUESTION_BANK_INTEGRATION_GUIDE.md`
4. **Contact**: Reach out to system administrator

---

## 🎯 Quick Checklist

### Before Creating Practice Task:
- [ ] Questions exist in Question Bank for the skill
- [ ] Skill is added to skill_order table
- [ ] Students are enrolled in the venue
- [ ] Task details are ready (title, day, due date, score)

### Before Taking Practice Test:
- [ ] Task is visible in Tasks list
- [ ] You have time to complete it
- [ ] Internet connection is stable
- [ ] Browser is updated

### Before Grading Submissions:
- [ ] Pending submissions are visible
- [ ] You understand the question requirements
- [ ] Grading rubric is clear
- [ ] Feedback is prepared

---

**Happy Teaching & Learning! 🎓**
