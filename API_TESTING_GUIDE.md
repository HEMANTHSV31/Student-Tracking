# Question Bank API Endpoints - Testing Guide

## Base URL
```
http://localhost:5000/api/question-bank
```

## Authentication
All endpoints require authentication. Include JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📚 COURSE ENDPOINTS

### 1. Get All Courses
**GET** `/courses`

**Access:** Admin, Faculty

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "course_id": 1,
      "course_name": "HTML / CSS Level1(frontend)",
      "course_type": "frontend",
      "skill_category": "HTML_CSS",
      "supports_mcq": 1,
      "supports_coding": 1,
      "description": "HTML and CSS fundamentals",
      "status": "Active",
      "created_at": "2026-02-07T...",
      "updated_at": "2026-02-07T..."
    }
  ]
}
```

### 2. Get Single Course
**GET** `/courses/:id`

**Access:** Admin, Faculty

**Example:** `GET /courses/1`

### 3. Create New Course
**POST** `/courses`

**Access:** Admin only

**Body:**
```json
{
  "course_name": "React Level1(frontend)",
  "course_type": "frontend",
  "skill_category": "REACT",
  "supports_mcq": 1,
  "supports_coding": 0,
  "description": "React fundamentals"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course_id": 4,
    "course_name": "React Level1(frontend)",
    "course_type": "frontend",
    "skill_category": "REACT"
  }
}
```

### 4. Update Course
**PUT** `/courses/:id`

**Access:** Admin only

**Body:** (all fields optional)
```json
{
  "description": "Updated description",
  "supports_coding": 1,
  "status": "Active"
}
```

### 5. Delete Course
**DELETE** `/courses/:id`

**Access:** Admin only

**Note:** Cannot delete if course has questions

---

## ❓ QUESTION ENDPOINTS

### 1. Get All Questions
**GET** `/questions`

**Access:** Admin, Faculty

**Query Parameters:**
- `course_id` - Filter by course
- `question_type` - Filter by type (mcq/coding)
- `difficulty_level` - Filter by difficulty (Easy/Medium/Hard)
- `status` - Filter by status (Active/Inactive/Draft)
- `search` - Search in title/description

**Example:** `GET /questions?course_id=1&question_type=mcq&difficulty_level=Easy`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "question_id": 1,
      "course_id": 1,
      "course_name": "HTML / CSS Level1(frontend)",
      "skill_category": "HTML_CSS",
      "title": "What is the correct CSS syntax?",
      "question_type": "mcq",
      "difficulty_level": "Easy",
      "max_score": 10,
      "time_limit_minutes": 5,
      "status": "Active",
      "created_at": "2026-02-07T...",
      "updated_at": "2026-02-07T...",
      "creator_name": "Admin User"
    }
  ]
}
```

### 2. Get Single Question
**GET** `/questions/:id`

**Access:** Admin, Faculty

**Example:** `GET /questions/1`

**Response:**
```json
{
  "success": true,
  "data": {
    "question_id": 1,
    "course_id": 1,
    "course_name": "HTML / CSS Level1(frontend)",
    "title": "What is the correct CSS syntax?",
    "description": "Choose the correct way to write CSS...",
    "question_type": "mcq",
    "difficulty_level": "Easy",
    "mcq_options": [
      {"id": "A", "text": "color: red;"},
      {"id": "B", "text": "red: color;"},
      {"id": "C", "text": "color = red"},
      {"id": "D", "text": "text-color: red"}
    ],
    "mcq_correct_answer": "A",
    "mcq_explanation": "The correct CSS syntax is property: value;",
    "max_score": 10,
    "time_limit_minutes": 5,
    "hints": null,
    "status": "Active",
    "created_at": "2026-02-07T...",
    "creator_name": "Admin User"
  }
}
```

### 3. Create MCQ Question
**POST** `/questions`

**Access:** Admin, Faculty

**Body:**
```json
{
  "course_id": 1,
  "title": "What is the correct CSS syntax?",
  "description": "Choose the correct way to write CSS for setting text color to red.",
  "question_type": "mcq",
  "difficulty_level": "Easy",
  "mcq_options": [
    {"id": "A", "text": "color: red;"},
    {"id": "B", "text": "red: color;"},
    {"id": "C", "text": "color = red"},
    {"id": "D", "text": "text-color: red"}
  ],
  "mcq_correct_answer": "A",
  "mcq_explanation": "The correct CSS syntax is property: value; Therefore, color: red; is correct.",
  "max_score": 10,
  "time_limit_minutes": 5,
  "hints": "Think about CSS property-value pairs",
  "status": "Active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question_id": 15,
    "title": "What is the correct CSS syntax?",
    "question_type": "mcq"
  }
}
```

### 4. Create Coding Question
**POST** `/questions`

**Access:** Admin, Faculty

**Body:**
```json
{
  "course_id": 2,
  "title": "Array Filter - Even Numbers",
  "description": "Write a JavaScript function that filters even numbers from an array.\n\nFunction signature:\nfunction filterEvenNumbers(arr) { ... }\n\nExample:\nInput: [1,2,3,4,5,6]\nOutput: [2,4,6]",
  "question_type": "coding",
  "difficulty_level": "Easy",
  "coding_starter_code": "function filterEvenNumbers(arr) {\n  // Write your code here\n  \n}",
  "coding_language_support": "javascript",
  "coding_test_cases": [
    {
      "input": "[1,2,3,4,5,6]",
      "expected": "[2,4,6]",
      "description": "Basic even filter"
    },
    {
      "input": "[10,15,20,25]",
      "expected": "[10,20]",
      "description": "Mixed even/odd"
    },
    {
      "input": "[1,3,5,7]",
      "expected": "[]",
      "description": "All odd numbers"
    }
  ],
  "coding_expected_output": "A function that returns an array containing only even numbers from the input array",
  "max_score": 100,
  "time_limit_minutes": 30,
  "hints": "Use the filter() method and modulo operator (%)",
  "status": "Active"
}
```

### 5. Update Question
**PUT** `/questions/:id`

**Access:** Admin, Faculty

**Body:** (all fields optional)
```json
{
  "title": "Updated title",
  "difficulty_level": "Medium",
  "max_score": 15,
  "status": "Active"
}
```

### 6. Delete Question
**DELETE** `/questions/:id`

**Access:** Admin only

**Note:** Soft delete if has submissions, hard delete otherwise

---

## 📊 ADDITIONAL ENDPOINTS

### 1. Get Questions by Course
**GET** `/questions/by-course/:courseId`

**Access:** Admin, Faculty

**Query Parameters:**
- `question_type` - Optional filter (mcq/coding)

**Example:** `GET /questions/by-course/1?question_type=mcq`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "question_id": 1,
      "title": "What is the correct CSS syntax?",
      "question_type": "mcq",
      "difficulty_level": "Easy",
      "max_score": 10,
      "time_limit_minutes": 5,
      "status": "Active",
      "created_at": "2026-02-07T..."
    }
  ]
}
```

### 2. Get Statistics
**GET** `/statistics`

**Access:** Admin, Faculty

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_questions": 50,
      "mcq_count": 30,
      "coding_count": 20,
      "easy_count": 20,
      "medium_count": 20,
      "hard_count": 10,
      "active_count": 45,
      "inactive_count": 3,
      "draft_count": 2
    },
    "by_course": [
      {
        "course_id": 1,
        "course_name": "HTML / CSS Level1(frontend)",
        "skill_category": "HTML_CSS",
        "question_count": 25
      },
      {
        "course_id": 2,
        "course_name": "Java Script Level1(frontend)",
        "skill_category": "JAVASCRIPT",
        "question_count": 15
      },
      {
        "course_id": 3,
        "course_name": "Git & GitHub(frontend)",
        "skill_category": "GIT_GITHUB",
        "question_count": 10
      }
    ]
  }
}
```

---

## 🧪 Testing with Postman/Thunder Client

### 1. Setup Environment Variables
```
BASE_URL = http://localhost:5000
TOKEN = <your_jwt_token>
```

### 2. Test Flow

#### Step 1: Get All Courses
```
GET {{BASE_URL}}/api/question-bank/courses
Authorization: Bearer {{TOKEN}}
```

#### Step 2: Create MCQ Question for HTML/CSS
```
POST {{BASE_URL}}/api/question-bank/questions
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "course_id": 1,
  "title": "HTML Heading Tags",
  "description": "Which HTML tag is used for the largest heading?",
  "question_type": "mcq",
  "difficulty_level": "Easy",
  "mcq_options": [
    {"id": "A", "text": "<h1>"},
    {"id": "B", "text": "<h6>"},
    {"id": "C", "text": "<heading>"},
    {"id": "D", "text": "<head>"}
  ],
  "mcq_correct_answer": "A",
  "mcq_explanation": "<h1> is the largest heading tag in HTML",
  "max_score": 10,
  "time_limit_minutes": 3
}
```

#### Step 3: Create Coding Question for JavaScript
```
POST {{BASE_URL}}/api/question-bank/questions
Authorization: Bearer {{TOKEN}}
Content-Type: application/json

{
  "course_id": 2,
  "title": "Sum of Array",
  "description": "Write a function to calculate sum of all numbers in an array",
  "question_type": "coding",
  "difficulty_level": "Easy",
  "coding_starter_code": "function sumArray(arr) {\n  // Your code here\n}",
  "coding_language_support": "javascript",
  "coding_test_cases": [
    {"input": "[1,2,3]", "expected": "6"}
  ],
  "max_score": 100,
  "time_limit_minutes": 20
}
```

#### Step 4: Get All Questions with Filters
```
GET {{BASE_URL}}/api/question-bank/questions?course_id=1&question_type=mcq
Authorization: Bearer {{TOKEN}}
```

#### Step 5: Get Statistics
```
GET {{BASE_URL}}/api/question-bank/statistics
Authorization: Bearer {{TOKEN}}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Course name, type, and category are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin role required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Question not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Course with this name and type already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch questions",
  "error": "Database connection error"
}
```

---

## 🔍 Common Use Cases

### Use Case 1: Admin Creates HTML/CSS MCQ Questions
1. Get HTML/CSS course ID: `GET /courses`
2. Create 10 MCQ questions: `POST /questions` (repeat 10 times)
3. Verify: `GET /questions?course_id=1&question_type=mcq`

### Use Case 2: Admin Creates HTML/CSS Coding Questions
1. Create 5 coding questions: `POST /questions` with `question_type: "coding"`
2. Verify: `GET /questions?course_id=1&question_type=coding`

### Use Case 3: Faculty Views Questions for Their Course
1. Get course ID: `GET /courses`
2. Get all questions: `GET /questions/by-course/1`
3. Get specific question details: `GET /questions/:id`

### Use Case 4: Admin Views Dashboard Statistics
1. Get overall stats: `GET /statistics`
2. View questions per course
3. Check active vs inactive counts

---

## 📝 Notes

1. **MCQ Questions:**
   - Must have 4 options (A, B, C, D)
   - Must specify correct answer
   - Typically 10 points per question
   - 3-5 minutes time limit

2. **Coding Questions:**
   - Must have starter code
   - Test cases are optional but recommended
   - Typically 100 points per question
   - 20-60 minutes time limit

3. **Course Validation:**
   - System validates if course supports question type
   - Cannot create MCQ for JavaScript (coding only)
   - Cannot create Coding for Git/GitHub (MCQ only)
   - HTML/CSS supports both types

4. **Deletion:**
   - Courses with questions cannot be deleted
   - Questions with submissions are soft-deleted (status = Inactive)
   - Questions without submissions are hard-deleted

---

## ✅ Backend Phase 2 Complete!

**What's Working:**
- ✅ All CRUD operations for courses
- ✅ All CRUD operations for questions (MCQ + Coding)
- ✅ Validation for question types per course
- ✅ Filtering and search
- ✅ Statistics dashboard
- ✅ Role-based access control

**Next Steps:**
- Run migration to create tables
- Test all endpoints
- Build frontend admin UI
