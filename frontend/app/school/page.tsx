'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'

interface School {
  id: string
  name: string
  address: string
  verification_status: string
}

interface Classroom {
  id: string
  name: string
  grade: string
  section: string
  join_code: string
  teacher_id: string
  student_count: number
}

interface HomeworkItem {
  id: string
  title: string
  description: string
  due_date: string
  classroom_id: string
}

interface StudentTracking {
  student_id: string
  homework_viewed: number
  total_time_spent: number
  last_viewed: string
}

export default function SchoolPage() {
  // State
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [homework, setHomework] = useState<HomeworkItem[]>([])
  const [students, setStudents] = useState<StudentTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [showCreateSchool, setShowCreateSchool] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classrooms' | 'homework' | 'tracking' | 'ai-generator'>('dashboard')
  const [className, setClassName] = useState('')
  const [classGrade, setClassGrade] = useState('')
  const [classSection, setClassSection] = useState('')
  const [homeworkTitle, setHomeworkTitle] = useState('')
  const [homeworkDesc, setHomeworkDesc] = useState('')
  const [homeworkDueDate, setHomeworkDueDate] = useState('')
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [creatingClassroom, setCreatingClassroom] = useState(false)
  const [creatingHomework, setCreatingHomework] = useState(false)

  // AI Question Generator States
  const [aiContent, setAiContent] = useState('')
  const [aiQuestions, setAiQuestions] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNumQuestions, setAiNumQuestions] = useState(5)

  const token = useAuthStore((s) => s.token)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

  // ─── Fetch Schools ──────────────────────────────────────
  const fetchSchools = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/schools/my-schools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSchools(data.schools || [])
        if (data.schools?.length > 0 && !selectedSchool) {
          setSelectedSchool(data.schools[0])
        }
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
    } finally {
      setLoading(false)
    }
  }

  // ─── Fetch Classrooms ──────────────────────────────────
  const fetchClassrooms = async (schoolId: string) => {
    if (!token || !schoolId) return
    try {
      const res = await fetch(`${baseUrl}/schools/${schoolId}/classrooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setClassrooms(data.classrooms || [])
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  // ─── Fetch Homework ────────────────────────────────────
  const fetchHomework = async (schoolId: string) => {
    if (!token || !schoolId) return
    try {
      const res = await fetch(`${baseUrl}/schools/${schoolId}/homework`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHomework(data.homework || [])
      }
    } catch (error) {
      console.error('Error fetching homework:', error)
    }
  }

  // ─── Fetch Student Tracking ────────────────────────────
  const fetchTracking = async (schoolId: string) => {
    if (!token || !schoolId) return
    try {
      const res = await fetch(`${baseUrl}/schools/${schoolId}/students/tracking`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching tracking:', error)
    }
  }

  useEffect(() => {
    if (token) {
      fetchSchools()
    }
  }, [token])

  useEffect(() => {
    if (selectedSchool) {
      fetchClassrooms(selectedSchool.id)
      fetchHomework(selectedSchool.id)
      fetchTracking(selectedSchool.id)
    }
  }, [selectedSchool])

  // ─── Create School ─────────────────────────────────────
  const createSchool = async () => {
    if (!schoolName.trim()) {
      alert('Please enter a school name')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${baseUrl}/schools/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: schoolName.trim(),
          address: schoolAddress.trim() || 'No address'
        })
      })
      if (res.ok) {
        alert('School created successfully!')
        setSchoolName('')
        setSchoolAddress('')
        setShowCreateSchool(false)
        await fetchSchools()
      } else {
        alert('Error creating school')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating school')
    } finally {
      setCreating(false)
    }
  }

  // ─── Create Classroom ──────────────────────────────────
  const createClassroom = async () => {
    if (!className.trim() || !selectedSchool) {
      alert('Please enter a classroom name')
      return
    }
    setCreatingClassroom(true)
    try {
      const res = await fetch(`${baseUrl}/schools/${selectedSchool.id}/classrooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: className.trim(),
          grade: classGrade,
          section: classSection
        })
      })
      if (res.ok) {
        alert('Classroom created!')
        setClassName('')
        setClassGrade('')
        setClassSection('')
        await fetchClassrooms(selectedSchool.id)
      } else {
        alert('Error creating classroom')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating classroom')
    } finally {
      setCreatingClassroom(false)
    }
  }

  // ─── Create Homework ───────────────────────────────────
  const createHomework = async () => {
    if (!homeworkTitle.trim() || !selectedClassroomId) {
      alert('Please enter a title and select a classroom')
      return
    }
    setCreatingHomework(true)
    try {
      const res = await fetch(`${baseUrl}/schools/homework/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: homeworkTitle.trim(),
          description: homeworkDesc.trim(),
          classroom_id: selectedClassroomId,
          due_date: homeworkDueDate || null
        })
      })
      if (res.ok) {
        alert('Homework posted!')
        setHomeworkTitle('')
        setHomeworkDesc('')
        setHomeworkDueDate('')
        await fetchHomework(selectedSchool!.id)
      } else {
        alert('Error creating homework')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating homework')
    } finally {
      setCreatingHomework(false)
    }
  }

  // ─── AI Question Generator ─────────────────────────────
  const generateAIQuestions = async () => {
    if (!aiContent.trim() || aiContent.length < 50) {
      alert('Please enter at least 50 characters of content')
      return
    }

    setAiLoading(true)
    setAiQuestions([])
    
    try {
      const url = `${baseUrl}/schools/ai/generate-questions`
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: aiContent,
          num_questions: aiNumQuestions,
          grade_level: 'middle school',
          subject: 'general'
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAiQuestions(data.questions || [])
      } else {
        const error = await res.text()
        alert('Error generating questions: ' + error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error generating questions. Make sure backend is running.')
    } finally {
      setAiLoading(false)
    }
  }

  const copyQuestionsToClipboard = () => {
    const text = aiQuestions.map((q, i) => `${i+1}. ${q.question}`).join('\n\n')
    navigator.clipboard.writeText(text)
    alert('Questions copied to clipboard!')
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">School System</h1>

      {/* School Selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {schools.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSchool(s)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedSchool?.id === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={() => setShowCreateSchool(true)}
          className="px-4 py-2 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
        >
          + New School
        </button>
      </div>

      {/* School Info */}
      {selectedSchool && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <p className="font-semibold text-gray-900 dark:text-white">{selectedSchool.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSchool.address}</p>
          <span className={`text-xs px-2 py-1 rounded-full ${
            selectedSchool.verification_status === 'verified'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {selectedSchool.verification_status || 'pending'}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['dashboard', 'classrooms', 'homework', 'tracking', 'ai-generator'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab === 'ai-generator' ? 'AI Generator' : tab}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && selectedSchool && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Classrooms</h3>
            <p className="text-2xl font-bold text-blue-600">{classrooms.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total classrooms</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Homework</h3>
            <p className="text-2xl font-bold text-purple-600">{homework.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total assignments</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Students</h3>
            <p className="text-2xl font-bold text-green-600">{students.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active students</p>
          </div>
        </div>
      )}

      {/* Classrooms Tab */}
      {activeTab === 'classrooms' && selectedSchool && (
        <div>
          {/* Create Classroom Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Create Classroom</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Classroom name"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Grade (e.g., 10)"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
              />
              <input
                type="text"
                placeholder="Section (e.g., A)"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
              />
            </div>
            <button
              onClick={createClassroom}
              disabled={creatingClassroom}
              className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {creatingClassroom ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>

          {/* Classrooms List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">{c.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Grade: {c.grade || 'N/A'} | Section: {c.section || 'N/A'}</p>
                <p className="text-xs text-gray-400">Join Code: <span className="font-mono font-bold">{c.join_code}</span></p>
                <p className="text-sm text-gray-500">Students: {c.student_count || 0}</p>
              </div>
            ))}
            {classrooms.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-8">No classrooms yet. Create one above!</p>
            )}
          </div>
        </div>
      )}

      {/* Homework Tab */}
      {activeTab === 'homework' && selectedSchool && (
        <div>
          {/* Create Homework Form */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Post Homework</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Homework title"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={homeworkTitle}
                onChange={(e) => setHomeworkTitle(e.target.value)}
              />
              <select
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
              >
                <option value="">Select Classroom</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Description"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3"
              rows={3}
              value={homeworkDesc}
              onChange={(e) => setHomeworkDesc(e.target.value)}
            />
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3"
              value={homeworkDueDate}
              onChange={(e) => setHomeworkDueDate(e.target.value)}
            />
            <button
              onClick={createHomework}
              disabled={creatingHomework}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {creatingHomework ? 'Posting...' : 'Post Homework'}
            </button>
          </div>

          {/* Homework List */}
          <div className="space-y-3">
            {homework.map((h) => (
              <div key={h.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white">{h.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{h.description}</p>
                <p className="text-xs text-gray-500">Due: {h.due_date ? new Date(h.due_date).toLocaleDateString() : 'No due date'}</p>
              </div>
            ))}
            {homework.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No homework posted yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tracking Tab */}
      {activeTab === 'tracking' && selectedSchool && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Student Engagement Tracking</h3>
          {students.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No student data yet. Start posting homework to track engagement!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Student</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Homework Viewed</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Time Spent</th>
                    <th className="text-left py-2 text-gray-600 dark:text-gray-400">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.student_id || i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">Student {i + 1}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{s.homework_viewed}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{s.total_time_spent}m</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{s.last_viewed ? new Date(s.last_viewed).toLocaleDateString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI Generator Tab */}
      {activeTab === 'ai-generator' && selectedSchool && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">AI Question Generator</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Paste your homework content or lesson text. The AI will generate questions for students.
            <span className="text-yellow-600 dark:text-yellow-400 block mt-1">
              Note: Questions only - no answers provided. Students need to find answers themselves.
            </span>
          </p>

          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Questions:
            </label>
            <select
              value={aiNumQuestions}
              onChange={(e) => setAiNumQuestions(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white min-h-[120px]"
            placeholder="Paste your content here (at least 50 characters)..."
            value={aiContent}
            onChange={(e) => setAiContent(e.target.value)}
          />

          <button
            onClick={generateAIQuestions}
            disabled={aiLoading}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {aiLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating...
              </>
            ) : (
              'Generate Questions'
            )}
          </button>

          {aiQuestions.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                Generated Questions ({aiQuestions.length})
                <button
                  onClick={copyQuestionsToClipboard}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy All
                </button>
              </h4>
              <div className="space-y-3">
                {aiQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400 min-w-[24px]">
                        {idx + 1}.
                      </span>
                      <div>
                        <p className="text-gray-800 dark:text-gray-200">{q.question}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            {q.type || 'comprehension'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                            {q.difficulty || 'medium'}
                          </span>
                          {q.topic && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                              {q.topic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchool && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateSchool(false)}
        >
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create School</h2>
            <input
              type="text"
              placeholder="School name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Address (optional)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
            />
            <button
              onClick={createSchool}
              disabled={creating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create School'}
            </button>
            <button
              onClick={() => setShowCreateSchool(false)}
              className="w-full mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
