import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './QuestionForm.css';

const QuestionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    course_id: '',
    question_type: 'mcq',
    title: '',
    description: '',
    difficulty_level: 'Medium',
    max_score: 10,
    time_limit_minutes: 30,
    status: 'Draft',
    // MCQ specific
    mcq_option_a: '',
    mcq_option_b: '',
    mcq_option_c: '',
    mcq_option_d: '',
    mcq_correct_answer: '',
    // Coding specific
    coding_language: 'javascript',
    coding_starter_code: '',
    coding_solution_code: '',
    coding_test_cases: [
      { input: '', expected_output: '', is_hidden: false }
    ]
  });

  useEffect(() => {
    fetchCourses();
    if (isEditMode) {
      fetchQuestion();
    }
  }, [id]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/courses`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    }
  };

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/questions/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const question = response.data.data;
        
        // Parse MCQ options if present
        let mcqData = {};
        if (question.mcq_options) {
          const options = JSON.parse(question.mcq_options);
          mcqData = {
            mcq_option_a: options.option_a || '',
            mcq_option_b: options.option_b || '',
            mcq_option_c: options.option_c || '',
            mcq_option_d: options.option_d || '',
            mcq_correct_answer: question.mcq_correct_answer || ''
          };
        }

        // Parse coding test cases if present
        let codingData = {};
        if (question.coding_test_cases) {
          const testCases = JSON.parse(question.coding_test_cases);
          codingData = {
            coding_language: question.coding_language || 'javascript',
            coding_starter_code: question.coding_starter_code || '',
            coding_solution_code: question.coding_solution_code || '',
            coding_test_cases: testCases.length > 0 ? testCases : [{ input: '', expected_output: '', is_hidden: false }]
          };
        }

        setFormData({
          course_id: question.course_id,
          question_type: question.question_type,
          title: question.title,
          description: question.description || '',
          difficulty_level: question.difficulty_level,
          max_score: question.max_score,
          time_limit_minutes: question.time_limit_minutes,
          status: question.status,
          ...mcqData,
          ...codingData
        });
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...formData.coding_test_cases];
    newTestCases[index][field] = value;
    setFormData(prev => ({ ...prev, coding_test_cases: newTestCases }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      coding_test_cases: [
        ...prev.coding_test_cases,
        { input: '', expected_output: '', is_hidden: false }
      ]
    }));
  };

  const removeTestCase = (index) => {
    if (formData.coding_test_cases.length > 1) {
      const newTestCases = formData.coding_test_cases.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, coding_test_cases: newTestCases }));
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!formData.course_id) {
      setError('Please select a course');
      return false;
    }

    if (!formData.title.trim()) {
      setError('Please enter a question title');
      return false;
    }

    // MCQ validation
    if (formData.question_type === 'mcq') {
      if (!formData.mcq_option_a || !formData.mcq_option_b || 
          !formData.mcq_option_c || !formData.mcq_option_d) {
        setError('Please fill all MCQ options');
        return false;
      }

      if (!formData.mcq_correct_answer) {
        setError('Please select the correct answer');
        return false;
      }
    }

    // Coding validation
    if (formData.question_type === 'coding') {
      if (!formData.coding_language) {
        setError('Please select a programming language');
        return false;
      }

      if (formData.coding_test_cases.some(tc => !tc.input || !tc.expected_output)) {
        setError('Please fill all test case inputs and expected outputs');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Prepare request body based on question type
      const requestBody = {
        course_id: formData.course_id,
        question_type: formData.question_type,
        title: formData.title,
        description: formData.description,
        difficulty_level: formData.difficulty_level,
        max_score: parseInt(formData.max_score),
        time_limit_minutes: parseInt(formData.time_limit_minutes),
        status: formData.status
      };

      if (formData.question_type === 'mcq') {
        requestBody.mcq_options = JSON.stringify({
          option_a: formData.mcq_option_a,
          option_b: formData.mcq_option_b,
          option_c: formData.mcq_option_c,
          option_d: formData.mcq_option_d
        });
        requestBody.mcq_correct_answer = formData.mcq_correct_answer;
      }

      if (formData.question_type === 'coding') {
        requestBody.coding_language = formData.coding_language;
        requestBody.coding_starter_code = formData.coding_starter_code;
        requestBody.coding_solution_code = formData.coding_solution_code;
        requestBody.coding_test_cases = JSON.stringify(formData.coding_test_cases);
      }

      let response;
      if (isEditMode) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/question-bank/questions/${id}`,
          requestBody,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/question-bank/questions`,
          requestBody,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        setSuccessMessage(isEditMode ? 'Question updated successfully!' : 'Question created successfully!');
        setTimeout(() => {
          navigate('/admin/question-bank/questions');
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving question:', err);
      setError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find(c => c.course_id === parseInt(formData.course_id));

  return (
    <div className="question-form-container">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? 'Edit Question' : 'Create New Question'}</h1>
          <p className="subtitle">
            {isEditMode ? 'Update question details' : 'Add a new MCQ or Coding question to the bank'}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/admin/question-bank/questions')}>
          ← Back to Questions
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="question-form">
        {/* Basic Details */}
        <div className="form-section">
          <h2 className="section-title">Basic Details</h2>

          <div className="form-row">
            <div className="form-group">
              <label>
                Course <span className="required">*</span>
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Question Type <span className="required">*</span>
              </label>
              <select
                name="question_type"
                value={formData.question_type}
                onChange={handleInputChange}
                required
                disabled={isEditMode} // Cannot change type in edit mode
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="coding">Coding Challenge</option>
              </select>
              {selectedCourse && (
                <small className="field-hint">
                  {formData.question_type === 'mcq' && !selectedCourse.supports_mcq && (
                    <span className="text-warning">⚠️ This course doesn't support MCQ</span>
                  )}
                  {formData.question_type === 'coding' && !selectedCourse.supports_coding && (
                    <span className="text-warning">⚠️ This course doesn't support Coding</span>
                  )}
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>
              Question Title <span className="required">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a clear and concise question title"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="Provide detailed instructions or context for the question"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Difficulty Level <span className="required">*</span>
              </label>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleInputChange}
                required
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Max Score <span className="required">*</span>
              </label>
              <input
                type="number"
                name="max_score"
                value={formData.max_score}
                onChange={handleInputChange}
                min="1"
                max="100"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Time Limit (minutes) <span className="required">*</span>
              </label>
              <input
                type="number"
                name="time_limit_minutes"
                value={formData.time_limit_minutes}
                onChange={handleInputChange}
                min="1"
                max="180"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Status <span className="required">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* MCQ Specific Fields */}
        {formData.question_type === 'mcq' && (
          <div className="form-section">
            <h2 className="section-title">MCQ Options</h2>

            <div className="form-group">
              <label>
                Option A <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mcq_option_a"
                value={formData.mcq_option_a}
                onChange={handleInputChange}
                placeholder="Enter option A"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Option B <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mcq_option_b"
                value={formData.mcq_option_b}
                onChange={handleInputChange}
                placeholder="Enter option B"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Option C <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mcq_option_c"
                value={formData.mcq_option_c}
                onChange={handleInputChange}
                placeholder="Enter option C"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Option D <span className="required">*</span>
              </label>
              <input
                type="text"
                name="mcq_option_d"
                value={formData.mcq_option_d}
                onChange={handleInputChange}
                placeholder="Enter option D"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Correct Answer <span className="required">*</span>
              </label>
              <select
                name="mcq_correct_answer"
                value={formData.mcq_correct_answer}
                onChange={handleInputChange}
                required
              >
                <option value="">Select correct answer</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        )}

        {/* Coding Specific Fields */}
        {formData.question_type === 'coding' && (
          <div className="form-section">
            <h2 className="section-title">Coding Challenge Details</h2>

            <div className="form-group">
              <label>
                Programming Language <span className="required">*</span>
              </label>
              <select
                name="coding_language"
                value={formData.coding_language}
                onChange={handleInputChange}
                required
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="html_css">HTML/CSS</option>
              </select>
            </div>

            <div className="form-group">
              <label>Starter Code</label>
              <textarea
                name="coding_starter_code"
                value={formData.coding_starter_code}
                onChange={handleInputChange}
                rows="6"
                placeholder="// Initial code provided to students&#10;function solve() {&#10;  // Your code here&#10;}"
                className="code-textarea"
              />
              <small className="field-hint">Pre-filled code that students will see when they start</small>
            </div>

            <div className="form-group">
              <label>Solution Code</label>
              <textarea
                name="coding_solution_code"
                value={formData.coding_solution_code}
                onChange={handleInputChange}
                rows="8"
                placeholder="// Reference solution for faculty&#10;function solve() {&#10;  return result;&#10;}"
                className="code-textarea"
              />
              <small className="field-hint">Reference solution (visible only to faculty)</small>
            </div>

            <div className="test-cases-section">
              <div className="test-cases-header">
                <h3>Test Cases <span className="required">*</span></h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addTestCase}
                >
                  + Add Test Case
                </button>
              </div>

              {formData.coding_test_cases.map((testCase, index) => (
                <div key={index} className="test-case-card">
                  <div className="test-case-header">
                    <h4>Test Case {index + 1}</h4>
                    {formData.coding_test_cases.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon-small delete"
                        onClick={() => removeTestCase(index)}
                        title="Remove test case"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Input <span className="required">*</span></label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                      rows="3"
                      placeholder="Test case input (e.g., [1, 2, 3])"
                      required
                      className="code-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label>Expected Output <span className="required">*</span></label>
                    <textarea
                      value={testCase.expected_output}
                      onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                      rows="3"
                      placeholder="Expected output (e.g., 6)"
                      required
                      className="code-textarea"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={testCase.is_hidden}
                        onChange={(e) => handleTestCaseChange(index, 'is_hidden', e.target.checked)}
                      />
                      <span>Hidden test case (not visible to students)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/question-bank/questions')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Question' : 'Create Question'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
